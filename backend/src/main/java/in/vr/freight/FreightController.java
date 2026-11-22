package in.vr.freight;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Duration;
import java.util.*;
import java.util.function.Function;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/freight")
public class FreightController extends Records {
  private final JdbcTemplate jdbc;
  private final String password;

  public FreightController(JdbcTemplate jdbc, @Value("${BROKER_ADMIN_PASSWORD:}") String password) {
    this.jdbc = jdbc;
    this.password = password;
  }

  private boolean configured() {
    return password.length() >= 12;
  }

  static String digest(String s) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException(ex);
    }
  }

  private void admin(HttpServletRequest req) {
    String token =
        Arrays.stream(Optional.ofNullable(req.getCookies()).orElse(new Cookie[0]))
            .filter(c -> c.getName().equals("broker_session"))
            .map(Cookie::getValue)
            .findFirst()
            .orElse("");
    boolean ok =
        !token.isBlank()
            && Boolean.TRUE.equals(
                jdbc.queryForObject(
                    "select exists(select 1 from broker_session where fingerprint=? and"
                        + " expires_at>now())",
                    Boolean.class,
                    digest(token + ":" + password)));
    check(ok, "Sign in to access brokerage records.", 401);
  }

  private static void origin(HttpServletRequest req) {
    String value = req.getHeader("Origin");
    if (value == null) return;
    try {
      check(
          Objects.equals(URI.create(value).getAuthority(), req.getHeader("Host"))
              || value.equals(System.getenv("PUBLIC_ORIGIN")),
          "Cross-site requests are not accepted.",
          403);
    } catch (IllegalArgumentException e) {
      throw new Failure("Invalid origin.", 403);
    }
  }

  private ObjectNode body(HttpServletRequest req, int max) throws IOException {
    check(
        req.getContentType() != null
            && req.getContentType().toLowerCase(Locale.ROOT).startsWith("application/json"),
        "JSON content type required.",
        415);
    byte[] raw = req.getInputStream().readNBytes(max + 1);
    check(raw.length <= max, "Request too large.", 413);
    try {
      var b = JSON.readTree(raw);
      check(b != null && b.isObject(), "JSON object required.");
      return (ObjectNode) b;
    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
      throw new Failure("Malformed JSON.", 400);
    }
  }

  private ObjectNode records(boolean lock) {
    String data =
        jdbc.queryForObject(
            "select records::text from broker_state where id=1" + (lock ? " for update" : ""),
            String.class);
    try {
      return (ObjectNode) JSON.readTree(data);
    } catch (IOException ex) {
      throw new IllegalStateException(ex);
    }
  }

  private ObjectNode change(Function<ObjectNode, ObjectNode> update) {
    ObjectNode db = records(true);
    ObjectNode result = update.apply(db);
    jdbc.update("update broker_state set records=cast(? as jsonb) where id=1", db.toString());
    return result;
  }

  static ResponseEntity.BodyBuilder result(int status) {
    return ResponseEntity.status(status)
        .cacheControl(CacheControl.noStore())
        .header("X-Content-Type-Options", "nosniff");
  }

  @ExceptionHandler(Failure.class)
  ResponseEntity<?> failure(Failure e) {
    return result(e.status).body(obj("error", e.getMessage()));
  }

  @GetMapping({"/health", "/config"})
  ResponseEntity<?> config(HttpServletRequest req) {
    return result(200)
        .body(
            req.getRequestURI().endsWith("health")
                ? obj("status", "ok", "configured", configured())
                : obj("app", "Setu Logistics", "version", 1, "configured", configured()));
  }

  private void ready() {
    check(configured(), "Configure BROKER_ADMIN_PASSWORD (at least 12 characters).", 503);
  }

  private ResponseCookie cookie(HttpServletRequest req, String token, long seconds) {
    return ResponseCookie.from("broker_session", token)
        .path("/api/freight/")
        .httpOnly(true)
        .sameSite("Strict")
        .secure(
            req.isSecure()
                || Optional.ofNullable(System.getenv("PUBLIC_ORIGIN"))
                    .orElse("")
                    .startsWith("https://"))
        .maxAge(Duration.ofSeconds(seconds))
        .build();
  }

  @PostMapping("/admin/login")
  ResponseEntity<?> login(HttpServletRequest req) throws IOException {
    origin(req);
    ready();
    ObjectNode b = body(req, 16000);
    check(
        MessageDigest.isEqual(
            digest(password).getBytes(StandardCharsets.US_ASCII),
            digest(s(b, "password")).getBytes(StandardCharsets.US_ASCII)),
        "Incorrect password.",
        401);
    String token = Trips.token();
    jdbc.update("delete from broker_session where expires_at<=now()");
    jdbc.update(
        "insert into broker_session values (?,now()+interval '7 days')",
        digest(token + ":" + password));
    return result(200)
        .header("Set-Cookie", cookie(req, token, 604800).toString())
        .body(obj("authenticated", true));
  }

  @PostMapping("/admin/logout")
  ResponseEntity<?> logout(HttpServletRequest req) {
    origin(req);
    for (Cookie c : Optional.ofNullable(req.getCookies()).orElse(new Cookie[0]))
      if (c.getName().equals("broker_session"))
        jdbc.update(
            "delete from broker_session where fingerprint=?",
            digest(c.getValue() + ":" + password));
    return result(200)
        .header("Set-Cookie", cookie(req, "", 0).toString())
        .body(obj("success", true));
  }

  @GetMapping({
    "/public/board",
    "/admin/dashboard",
    "/admin/export",
    "/admin/matches/{id}",
    "/public/trips/{token}"
  })
  ResponseEntity<?> read(
      HttpServletRequest req,
      @PathVariable(required = false) String id,
      @PathVariable(required = false) String token) {
    ready();
    String path = req.getRequestURI();
    if (path.contains("/admin/")) admin(req);
    ObjectNode db = records(false);
    ObjectNode out =
        token != null
            ? Trips.view(db, Trips.driver(db, token))
            : id != null
                ? Market.matches(db, id)
                : path.endsWith("/board")
                    ? Market.board(db)
                    : path.endsWith("/export") ? db : Market.dashboard(db);
    return result(200).body(out);
  }

  @Transactional
  @PostMapping("/public/{table:loads|trucks|applications}")
  ResponseEntity<?> submit(@PathVariable String table, HttpServletRequest req) throws IOException {
    origin(req);
    ready();
    ObjectNode b = body(req, 16000), out = change(db -> Market.submit(db, table, b));
    return result(s(out, "reference").equals("RECEIVED") ? 202 : 201).body(out);
  }

  @Transactional
  @PostMapping({
    "/admin/quotes",
    "/admin/trips",
    "/admin/trips/{id}/payments",
    "/public/trips/{token}/requests"
  })
  ResponseEntity<?> create(
      HttpServletRequest req,
      @PathVariable(required = false) String id,
      @PathVariable(required = false) String token)
      throws IOException {
    origin(req);
    ready();
    if (token == null) admin(req);
    ObjectNode b = body(req, 16000);
    return result(id == null ? 201 : 200)
        .body(
            change(
                db ->
                    token != null
                        ? Trips.request(db, Trips.driver(db, token), b)
                        : id != null
                            ? Trips.pay(db, id, b)
                            : req.getRequestURI().endsWith("/quotes")
                                ? Market.quote(db, b)
                                : Trips.create(db, b)));
  }

  @Transactional
  @PatchMapping("/admin/{table:applications|trucks|loads|quotes|requests|trips}/{id}/status")
  ResponseEntity<?> update(
      @PathVariable String table, @PathVariable String id, HttpServletRequest req)
      throws IOException {
    origin(req);
    ready();
    admin(req);
    ObjectNode b = body(req, 16000);
    return result(200)
        .body(
            change(
                db ->
                    switch (table) {
                      case "requests" -> Trips.review(db, id, b);
                      case "trips" -> Trips.advance(db, id, b);
                      default -> Market.update(db, table, id, b);
                    }));
  }

  @Transactional
  @PostMapping({"/admin/documents", "/public/trips/{token}/documents"})
  ResponseEntity<?> upload(@PathVariable(required = false) String token, HttpServletRequest req)
      throws IOException {
    origin(req);
    ready();
    if (token == null) admin(req);
    ObjectNode b = body(req, 4300000);
    return result(201)
        .body(
            change(
                db -> {
                  ObjectNode t =
                      token != null
                          ? Trips.driver(db, token)
                          : s(b, "tripId").isEmpty() ? null : need(db, "trips", s(b, "tripId"));
                  String truck =
                      t == null ? s(need(db, "trucks", s(b, "truckId")), "id") : s(t, "truckId");
                  String mime = s(b, "mime"),
                      kind = s(b, "kind"),
                      name = field(b, "name", 120).replace('/', '_').replace('\\', '_');
                  check(
                      name.length() >= 3
                          && in(
                              kind, "pod", "loading", "unloading", "vehicle", "clearance", "other"),
                      "Invalid document details.");
                  byte[] bytes;
                  try {
                    bytes = Base64.getDecoder().decode(s(b, "base64"));
                  } catch (IllegalArgumentException e) {
                    throw new Failure("Invalid file encoding.", 400);
                  }
                  check(bytes.length <= 3 * 1024 * 1024, "Maximum file size is 3 MB.", 413);
                  String prefix = HexFormat.of().formatHex(bytes, 0, Math.min(12, bytes.length));
                  check(
                      switch (mime) {
                        case "application/pdf" -> prefix.startsWith("255044462d");
                        case "image/png" -> prefix.startsWith("89504e470d0a1a0a");
                        case "image/jpeg" -> bytes.length > 3 && prefix.startsWith("ffd8ff");
                        case "image/webp" ->
                            prefix.startsWith("52494646")
                                && prefix.endsWith("57454250")
                                && bytes.length >= 12;
                        default -> false;
                      },
                      "Invalid file content or unsupported file type.",
                      415);
                  check(db.withArray("documents").size() <= 20000, "Document limit reached.", 507);
                  String id = "DOC-" + UUID.randomUUID();
                  ObjectNode doc =
                      obj(
                          "id",
                          id,
                          "tripId",
                          t == null ? "" : s(t, "id"),
                          "truckId",
                          truck,
                          "kind",
                          kind,
                          "mime",
                          mime,
                          "name",
                          name,
                          "size",
                          bytes.length,
                          "submittedBy",
                          token == null ? "broker" : "trucker",
                          "createdAt",
                          now());
                  jdbc.update("insert into freight_attachment(id,content) values (?,?)", id, bytes);
                  db.withArray("documents").add(doc);
                  event(db, "document", id, "Evidence received for " + truck);
                  return obj("document", doc);
                }));
  }

  @GetMapping({"/admin/documents/{id}", "/public/trips/{token}/documents/{id}"})
  ResponseEntity<?> download(
      @PathVariable String id,
      @PathVariable(required = false) String token,
      HttpServletRequest req) {
    ready();
    if (token == null) admin(req);
    ObjectNode db = records(false), doc = need(db, "documents", id);
    if (token != null)
      check(s(Trips.driver(db, token), "id").equals(s(doc, "tripId")), "Document not found.", 404);
    var bytes =
        jdbc.queryForObject("select content from freight_attachment where id=?", byte[].class, id);
    return result(200)
        .contentType(MediaType.parseMediaType(s(doc, "mime")))
        .header(
            "Content-Disposition",
            ContentDisposition.attachment()
                .filename(s(doc, "name"), StandardCharsets.UTF_8)
                .build()
                .toString())
        .header("Content-Security-Policy", "default-src 'none'; sandbox")
        .body(bytes);
  }
}
