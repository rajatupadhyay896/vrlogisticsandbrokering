package in.vr.freight;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.time.*;
import java.util.*;
import java.util.stream.*;

class Records {
  static final ObjectMapper JSON = new ObjectMapper();

  static final class Failure extends RuntimeException {
    final int status;

    Failure(String message, int status) {
      super(message);
      this.status = status;
    }
  }

  static void check(boolean ok, String message, int status) {
    if (!ok) throw new Failure(message, status);
  }

  static void check(boolean ok, String message) {
    check(ok, message, 400);
  }

  static ObjectNode obj(Object... fields) {
    ObjectNode o = JSON.createObjectNode();
    for (int i = 0; i < fields.length; i += 2)
      o.set((String) fields[i], JSON.valueToTree(fields[i + 1]));
    return o;
  }

  static String s(JsonNode o, String k) {
    return o.path(k).asText("");
  }

  static String field(JsonNode o, String k, int max) {
    String v = s(o, k).strip().replaceAll("[<>\\p{Cntrl}]", "");
    return v.substring(0, Math.min(v.length(), max));
  }

  static double num(JsonNode o, String k) {
    return o.path(k).asDouble(Double.NaN);
  }

  static long money(JsonNode o, String k) {
    double n = num(o, k);
    check(Double.isFinite(n) && n >= 0.5 && n < Long.MAX_VALUE, "Enter a valid positive amount.");
    return Math.round(n);
  }

  static String now() {
    return Instant.now().toString();
  }

  static String today() {
    return LocalDate.now(ZoneOffset.UTC).toString();
  }

  static boolean date(String d) {
    try {
      return d.length() == 10 && LocalDate.parse(d).toString().equals(d);
    } catch (Exception ex) {
      return false;
    }
  }

  static boolean recent(JsonNode o) {
    return Instant.parse(s(o, "createdAt")).isAfter(Instant.now().minusSeconds(86400));
  }

  static boolean in(String value, String... options) {
    return Arrays.asList(options).contains(value);
  }

  static List<ObjectNode> rows(ObjectNode db, String table) {
    return StreamSupport.stream(db.withArray(table).spliterator(), false)
        .map(n -> (ObjectNode) n)
        .toList();
  }

  static ObjectNode find(ObjectNode db, String table, String key, String value) {
    return rows(db, table).stream().filter(r -> s(r, key).equals(value)).findFirst().orElse(null);
  }

  static ObjectNode need(ObjectNode db, String table, String id) {
    ObjectNode r = find(db, table, "id", id);
    check(r != null, "Record not found.", 404);
    return r;
  }

  static ObjectNode pick(JsonNode row, String keys) {
    ObjectNode r = obj();
    for (String k : keys.split(" ")) if (row.has(k)) r.set(k, row.get(k));
    return r;
  }

  static String next(ObjectNode db, String table, String prefix) {
    ObjectNode counts = (ObjectNode) db.get("counters");
    int n = counts.path(table).asInt() + 1;
    counts.put(table, n);
    return "%s-%05d".formatted(prefix, n);
  }

  static void event(ObjectNode db, String type, String ref, String description) {
    ArrayNode list = db.withArray("events");
    list.add(
        obj(
            "id",
            UUID.randomUUID().toString(),
            "at",
            now(),
            "type",
            type,
            "ref",
            ref,
            "description",
            description));
    if (list.size() > 600) list.remove(0);
  }

  static void state(ObjectNode row, String status) {
    row.put("status", status).put("updatedAt", now());
  }
}
