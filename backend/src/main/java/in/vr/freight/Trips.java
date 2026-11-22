package in.vr.freight;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.security.SecureRandom;
import java.util.*;

class Trips extends Records {
  static final List<String> STAGES =
      List.of(
          "assigned",
          "loaded",
          "in_transit",
          "delivered",
          "pod_submitted",
          "pod_accepted",
          "closed");
  static final SecureRandom RANDOM = new SecureRandom();

  static String token() {
    byte[] bytes = new byte[28];
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  static ObjectNode create(ObjectNode db, ObjectNode b) {
    ObjectNode q = find(db, "quotes", "id", s(b, "quoteId"));
    check(
        q != null && s(q, "status").equals("accepted"),
        "An accepted quotation is required before creating a trip.",
        409);
    ObjectNode existing = find(db, "trips", "quoteId", s(q, "id"));
    if (existing != null) return obj("trip", existing, "existing", true);
    ObjectNode t = need(db, "trucks", s(q, "truckId"));
    String id = next(db, "trips", "TRIP");
    ObjectNode trip =
        obj(
            "id",
            id,
            "quoteId",
            s(q, "id"),
            "loadId",
            s(q, "loadId"),
            "truckId",
            s(q, "truckId"),
            "vehicleNo",
            s(b, "vehicleNo").isBlank() ? s(t, "vehicleNo") : field(b, "vehicleNo", 30),
            "token",
            token(),
            "customerReceived",
            0,
            "truckerPaid",
            0,
            "createdAt",
            now());
    state(trip, "assigned");
    trip.putArray("paymentHistory");
    trip.putArray("history")
        .add(
            obj(
                "status",
                "assigned",
                "at",
                now(),
                "note",
                "Trip created from accepted quotation."));
    db.withArray("trips").add(trip);
    event(db, "trip", id, "Trip created and driver link issued");
    return obj("trip", trip, "existing", false);
  }

  static ObjectNode driver(ObjectNode db, String token) {
    ObjectNode t = find(db, "trips", "token", token);
    check(t != null && !token.isBlank(), "Trip access link is invalid.", 404);
    return t;
  }

  static ObjectNode view(ObjectNode db, ObjectNode t) {
    ObjectNode l = need(db, "loads", s(t, "loadId")), info = pick(t, "id status vehicleNo checkIn");
    info.setAll(pick(l, "origin destination material weightMt loadingDate"));
    info.put("companyPhone", "+917738103505")
        .put("customer", s(l, "company").isEmpty() ? "Transporter" : s(l, "company"));
    var docs =
        rows(db, "documents").stream()
            .filter(d -> s(d, "tripId").equals(s(t, "id")))
            .map(d -> pick(d, "id kind name mime size createdAt"))
            .toList();
    var reqs =
        rows(db, "requests").stream()
            .filter(r -> s(r, "tripId").equals(s(t, "id")))
            .map(
                r ->
                    pick(
                        r,
                        "id type status amount location reason estimatedResumeAt createdAt notes"))
            .toList();
    return obj("trip", info, "documents", docs, "requests", reqs);
  }

  static ObjectNode advance(ObjectNode db, String id, ObjectNode b) {
    ObjectNode t = need(db, "trips", id);
    String v = s(b, "status");
    check(STAGES.contains(v), "Invalid trip status.");
    check(
        STAGES.indexOf(v) == 1 + STAGES.indexOf(s(t, "status")),
        "Complete trip stages in order.",
        409);
    if (v.equals("pod_submitted"))
      check(
          rows(db, "documents").stream()
              .anyMatch(d -> s(d, "tripId").equals(id) && s(d, "kind").equals("pod")),
          "Upload POD before marking it submitted.",
          409);
    if (v.equals("closed")) {
      ObjectNode q = need(db, "quotes", s(t, "quoteId"));
      check(
          t.path("customerReceived").asLong() == q.path("customerRate").asLong()
              && t.path("truckerPaid").asLong() == q.path("truckerRate").asLong(),
          "Both balances must be settled before closing.",
          409);
    }
    state(t, v);
    t.withArray("history").add(obj("status", v, "at", now(), "note", field(b, "note", 300)));
    event(db, "trip", id, "Stage updated: " + v);
    return obj("trip", t);
  }

  static ObjectNode pay(ObjectNode db, String id, ObjectNode b) {
    ObjectNode t = need(db, "trips", id), q = need(db, "quotes", s(t, "quoteId"));
    String side = s(b, "side");
    check(in(side, "customer", "trucker"), "Select a payment side.");
    long amount = money(b, "amount");
    boolean customer = side.equals("customer");
    String key = customer ? "customerReceived" : "truckerPaid";
    long paid = t.path(key).asLong();
    check(
        amount <= q.path(customer ? "customerRate" : "truckerRate").asLong() - paid,
        "Amount exceeds outstanding freight balance.",
        409);
    t.put(key, paid + amount).put("updatedAt", now());
    t.withArray("paymentHistory")
        .add(
            obj(
                "id",
                UUID.randomUUID().toString(),
                "side",
                side,
                "amount",
                amount,
                "reference",
                field(b, "reference", 100),
                "at",
                now()));
    event(db, "payment", id, customer ? "Customer receipt recorded" : "Trucker payment recorded");
    return obj("trip", t);
  }

  static ObjectNode request(ObjectNode db, ObjectNode t, ObjectNode b) {
    String kind = s(b, "type"), id = s(t, "id");
    check(!s(t, "status").equals("closed"), "Trip already closed.", 409);
    check(in(kind, "halt", "payment"), "Choose payment or halt.");
    boolean halt = kind.equals("halt");
    long amount = halt ? 0 : money(b, "amount");
    String location = halt ? field(b, "location", 100) : "",
        reason = halt ? field(b, "reason", 500) : "";
    check(
        halt ? location.length() >= 2 && reason.length() >= 3 : amount <= 20000000,
        "Provide valid request details.");
    check(
        rows(db, "requests").stream().filter(r -> s(r, "tripId").equals(id) && recent(r)).count()
            < 12,
        "Too many requests today.",
        429);
    String ref = "REQ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    ObjectNode r =
        obj(
            "id",
            ref,
            "tripId",
            id,
            "type",
            kind,
            "amount",
            amount,
            "location",
            location,
            "reason",
            reason,
            "notes",
            field(b, "notes", 500),
            "estimatedResumeAt",
            field(b, "estimatedResumeAt", 60),
            "createdAt",
            now());
    state(r, "pending");
    db.withArray("requests").add(r);
    event(db, "request", ref, kind + " request for " + id);
    return obj("request", r, "reference", ref);
  }

  static ObjectNode review(ObjectNode db, String id, ObjectNode b) {
    ObjectNode r = need(db, "requests", id);
    String v = s(b, "status"), old = s(r, "status");
    check(in(v, "approved", "rejected", "resolved"), "Invalid request status.");
    check(
        old.equals("pending") && in(v, "approved", "rejected")
            || old.equals("approved") && v.equals("resolved"),
        "Invalid request transition.",
        409);
    state(r, v);
    r.put("reviewNote", field(b, "note", 300));
    event(db, "request", id, "Broker marked request " + v);
    return obj("request", r);
  }
}
