package in.vr.freight;

import com.fasterxml.jackson.databind.node.*;
import java.util.*;

class Market extends Records {
  static ObjectNode submit(ObjectNode db, String table, ObjectNode b) {
    String kind =
        switch (table) {
          case "loads" -> "load";
          case "trucks" -> "truck";
          default -> "application";
        };
    if (!s(b, "website").isEmpty() || !s(b, "fax").isEmpty()) return receipt("RECEIVED", kind);
    check(in(s(b, "consent"), "yes", "true"), "Please confirm permission to share these details.");
    String name = field(b, "contactName", 100),
        phone = s(b, "phone").replaceAll("[^0-9]", ""),
        email = field(b, "email", 150).toLowerCase(Locale.ROOT);
    check(
        name.length() >= 2
            && phone.matches("[0-9]{10,15}")
            && (email.isEmpty() || email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")),
        "Enter valid contact details.");
    String origin = field(b, "origin", 70),
        destination = field(b, "destination", 70),
        body = field(b, "bodyType", 30);
    double feet = num(b, "feet");
    check(
        !origin.isEmpty()
            && in(body, "open", "closed", "flatbed", "other", "container")
            && feet >= 5
            && feet <= 65,
        "Enter valid origin, body and length.");
    ObjectNode r =
        obj(
            "company",
            field(b, "company", 100),
            "contactName",
            name,
            "email",
            email,
            "phone",
            phone,
            "origin",
            origin,
            "bodyType",
            body,
            "feet",
            feet,
            "vehicleClass",
            field(b, "vehicleClass", 30));
    if (kind.equals("load")) {
      double weight = num(b, "weightMt");
      String material = field(b, "material", 140);
      check(
          !destination.isEmpty()
              && !destination.equalsIgnoreCase(origin)
              && weight >= 0.1
              && weight <= 70
              && date(s(b, "loadingDate"))
              && !material.isEmpty(),
          "Enter valid cargo, route, weight and loading date.");
      r.setAll(
          obj(
              "destination",
              destination,
              "material",
              material,
              "loadingDate",
              s(b, "loadingDate"),
              "weightMt",
              weight,
              "specialInstructions",
              field(b, "specialInstructions", 600)));
    } else {
      String from = s(b, "availableFrom"),
          vehicle = field(b, "vehicleNo", 24).toUpperCase(Locale.ROOT);
      double capacity = num(b, "capacityMt");
      check(
          date(from)
              && capacity >= 0.3
              && capacity <= 70
              && (vehicle.isEmpty() || vehicle.matches("[A-Z0-9 -]{5,24}")),
          "Enter valid vehicle details and availability.");
      r.setAll(
          obj(
              "availableFrom",
              from,
              "capacityMt",
              capacity,
              "vehicleNo",
              vehicle,
              "notes",
              field(b, "notes", 500)));
      if (kind.equals("truck")) {
        String until = s(b, "availableUntil");
        check(
            until.isEmpty() || (date(until) && until.compareTo(from) >= 0),
            "Invalid availability date range.");
        r.setAll(
            obj(
                "availableUntil",
                until,
                "destination",
                destination,
                "supplierType",
                s(b, "supplierType").equals("subbroker") ? "subbroker" : "owner"));
      } else {
        ObjectNode l = need(db, "loads", s(b, "loadId"));
        check(
            in(s(l, "status"), "new", "quoted")
                && s(l, "loadingDate").compareTo(today()) >= 0
                && compatible(l, r),
            "Load or vehicle unavailable for this date and capacity.",
            409);
        check(
            rows(db, table).stream()
                    .filter(
                        a ->
                            s(a, "loadId").equals(s(l, "id"))
                                && s(a, "phone").equals(phone)
                                && recent(a))
                    .count()
                < 2,
            "Application already received.",
            429);
        check(db.withArray(table).size() <= 20000, "Applications temporarily unavailable.", 503);
        r.put("loadId", s(l, "id"));
      }
    }
    String ref =
        next(
            db,
            table,
            switch (kind) {
              case "load" -> "LOD";
              case "truck" -> "TRK";
              default -> "APL";
            });
    r.put("id", ref).put("consentAt", now()).put("createdAt", now());
    state(r, kind.equals("truck") ? "available" : "new");
    db.withArray(table).add(r);
    event(db, kind, ref, "New " + kind + " submitted");
    return receipt(ref, kind);
  }

  static ObjectNode receipt(String ref, String kind) {
    return obj(
        "success",
        true,
        "reference",
        ref,
        "type",
        kind,
        "message",
        "Your request has been submitted. The brokerage team will review and contact you.");
  }

  static boolean compatible(ObjectNode l, ObjectNode t) {
    String date = s(l, "loadingDate"), until = s(t, "availableUntil");
    return num(t, "capacityMt") >= num(l, "weightMt")
        && num(t, "feet") >= num(l, "feet")
        && (s(l, "bodyType").equals("other") || s(t, "bodyType").equals(s(l, "bodyType")))
        && s(t, "availableFrom").compareTo(date) <= 0
        && (until.isEmpty() || until.compareTo(date) >= 0);
  }

  static int score(ObjectNode l, ObjectNode t) {
    if (!s(t, "status").equals("available") || !compatible(l, t)) return -1;
    String a = s(l, "origin").toLowerCase(Locale.ROOT), b = s(t, "origin").toLowerCase(Locale.ROOT);
    return 40
        + (a.equals(b) ? 40 : a.contains(b) || b.contains(a) ? 16 : 0)
        + (s(l, "destination").equalsIgnoreCase(s(t, "destination")) ? 12 : 0)
        + (num(l, "feet") == num(t, "feet") ? 6 : 0)
        + (num(t, "capacityMt") - num(l, "weightMt") < 2 ? 2 : 0);
  }

  static ObjectNode matches(ObjectNode db, String ref) {
    ObjectNode l = need(db, "loads", ref);
    return obj(
        "load",
        l,
        "matches",
        rows(db, "trucks").stream()
            .map(t -> t.deepCopy().put("matchScore", score(l, t)))
            .filter(t -> t.get("matchScore").asInt() >= 0)
            .sorted(Comparator.comparingInt(t -> -t.get("matchScore").asInt()))
            .toList());
  }

  static ObjectNode board(ObjectNode db) {
    var trucks =
        rows(db, "trucks").reversed().stream()
            .filter(
                t ->
                    s(t, "status").equals("available")
                        && (s(t, "availableUntil").isEmpty()
                            || s(t, "availableUntil").compareTo(today()) >= 0))
            .limit(120)
            .map(
                t ->
                    pick(
                        t,
                        "id origin destination bodyType feet capacityMt vehicleClass availableFrom"
                            + " availableUntil status documentReviewedAt"))
            .toList();
    var loads =
        rows(db, "loads").reversed().stream()
            .filter(
                l ->
                    in(s(l, "status"), "new", "quoted")
                        && s(l, "loadingDate").compareTo(today()) >= 0)
            .limit(100)
            .map(
                l ->
                    pick(
                        l,
                        "id origin destination bodyType feet weightMt vehicleClass material"
                            + " loadingDate status"))
            .toList();
    return obj("loads", loads, "trucks", trucks);
  }

  static long count(ObjectNode db, String table, String... statuses) {
    return rows(db, table).stream().filter(r -> in(s(r, "status"), statuses)).count();
  }

  static ObjectNode dashboard(ObjectNode db) {
    ObjectNode d = obj();
    for (String k :
        List.of("loads", "trucks", "applications", "quotes", "trips", "requests", "documents"))
      d.set(k, JSON.valueToTree(rows(db, k).reversed()));
    d.set("events", JSON.valueToTree(rows(db, "events").reversed().stream().limit(70).toList()));
    d.set(
        "summary",
        obj(
            "openLoads",
            count(db, "loads", "new", "quoted"),
            "availableTrucks",
            count(db, "trucks", "available"),
            "pendingApplications",
            count(db, "applications", "new"),
            "activeQuotes",
            count(db, "quotes", "sent", "draft"),
            "confirmed",
            count(db, "quotes", "accepted"),
            "expectedSpread",
            rows(db, "quotes").stream()
                .filter(q -> s(q, "status").equals("accepted"))
                .mapToLong(q -> q.get("customerRate").asLong() - q.get("truckerRate").asLong())
                .sum()));
    return d;
  }

  static ObjectNode quote(ObjectNode db, ObjectNode b) {
    ObjectNode l = need(db, "loads", s(b, "loadId")), t = need(db, "trucks", s(b, "truckId"));
    long customer = money(b, "customerRate"), owner = money(b, "truckerRate");
    check(
        customer >= owner && date(s(b, "validUntil")), "Invalid freight rates or quotation date.");
    check(
        !s(l, "status").equals("closed") && score(l, t) >= 0, "Load or vehicle unavailable.", 409);
    String ref = next(db, "quotes", "QTE");
    ObjectNode q =
        obj(
            "id",
            ref,
            "loadId",
            s(l, "id"),
            "truckId",
            s(t, "id"),
            "customerRate",
            customer,
            "truckerRate",
            owner,
            "validUntil",
            s(b, "validUntil"),
            "terms",
            field(b, "terms", 900),
            "notes",
            field(b, "notes", 500),
            "createdAt",
            now());
    state(q, "draft");
    state(l, "quoted");
    db.withArray("quotes").add(q);
    event(db, "quote", ref, "Quote drafted for " + s(l, "id"));
    String message =
        String.join(
            "\n",
            "FREIGHT QUOTATION — " + ref,
            "Reference: " + s(l, "id"),
            "From: " + s(l, "origin"),
            "To: " + s(l, "destination"),
            "Material: " + s(l, "material"),
            "Required truck: "
                + s(l, "feet")
                + " ft / "
                + s(l, "weightMt")
                + " MT ("
                + s(l, "bodyType")
                + ")",
            "Loading date: " + s(l, "loadingDate"),
            "Our freight quote: INR " + customer,
            "Rate validity: " + s(q, "validUntil"),
            "Included / excluded charges: " + s(q, "terms"),
            "Remarks: " + s(q, "notes"),
            "Subject to vehicle availability and final written acceptance.");
    return obj(
        "quote",
        q,
        "customer",
        pick(l, "company email phone").put("name", s(l, "contactName")),
        "message",
        message);
  }

  static ObjectNode update(ObjectNode db, String table, String ref, ObjectNode b) {
    ObjectNode r = need(db, table, ref);
    String old = s(r, "status"), v = s(b, "status");
    switch (table) {
      case "applications" -> {
        check(in(v, "new", "contacted", "shortlisted", "rejected"), "Invalid application status.");
        r.put("reviewNote", field(b, "note", 400));
      }
      case "trucks" -> {
        check(in(v, "available", "unavailable", "booked"), "Invalid truck status.");
        check(
            !old.equals("booked") || v.equals("booked"),
            "Booked vehicle cannot be released manually.",
            409);
      }
      case "loads" -> {
        check(in(v, "new", "quoted", "booked", "closed"), "Invalid load status.");
        check(
            !v.equals("booked")
                || rows(db, "quotes").stream()
                    .anyMatch(q -> s(q, "loadId").equals(ref) && s(q, "status").equals("accepted")),
            "Load requires an accepted quote.",
            409);
      }
      case "quotes" -> {
        check(
            old.equals("draft") && in(v, "sent", "declined")
                || old.equals("sent") && in(v, "accepted", "declined"),
            "Invalid quote status transition.",
            409);
        if (v.equals("accepted")) {
          ObjectNode t = need(db, "trucks", s(r, "truckId")), l = need(db, "loads", s(r, "loadId"));
          check(
              s(t, "status").equals("available")
                  && !s(l, "status").equals("closed")
                  && rows(db, "quotes").stream()
                      .noneMatch(
                          q ->
                              s(q, "status").equals("accepted")
                                  && (s(q, "loadId").equals(s(l, "id"))
                                      || s(q, "truckId").equals(s(t, "id")))),
              "Load or vehicle unavailable.",
              409);
          state(t, "booked");
          state(l, "booked");
        }
      }
      default -> throw new Failure("Endpoint not found.", 404);
    }
    state(r, v);
    event(db, table.substring(0, table.length() - 1), ref, "Status changed to " + v);
    return obj(table.equals("applications") ? "application" : "record", r);
  }
}
