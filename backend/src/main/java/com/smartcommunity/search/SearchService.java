package com.smartcommunity.search;

import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.billing.BillingService;
import com.smartcommunity.common.InvalidRequestException;
import com.smartcommunity.property.PropertyService;
import com.smartcommunity.resident.ResidentService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static com.smartcommunity.search.SearchDtos.*;

@Service
@Transactional(readOnly = true)
public class SearchService {
    private static final int LIMIT = 20;

    private final ResidentService residents;
    private final PropertyService property;
    private final BillingService billing;

    public SearchService(ResidentService residents, PropertyService property, BillingService billing) {
        this.residents = residents;
        this.property = property;
        this.billing = billing;
    }

    public SearchResponse search(String rawQuery, UUID apartmentId, UserPrincipal actor) {
        if (actor == null) {
            throw new InvalidRequestException("Authentication is required");
        }
        String q = rawQuery == null ? "" : rawQuery.trim().toLowerCase(Locale.ROOT);
        if (q.length() < 2) {
            throw new InvalidRequestException("Query must be at least 2 characters");
        }

        List<SearchHit> hits = new ArrayList<>();
        Role role = actor.getRole();

        boolean canResidents = role == Role.SUPER_ADMIN || role == Role.APARTMENT_ADMIN
                || role == Role.ADMIN || role == Role.STAFF;
        boolean canFlats = role != Role.SECURITY;
        boolean canBills = role == Role.SUPER_ADMIN || role == Role.APARTMENT_ADMIN
                || role == Role.ADMIN || role == Role.STAFF || role == Role.RESIDENT;

        if (canResidents) {
            try {
                for (var r : residents.list(apartmentId, actor)) {
                    String hay = ((r.fullName() == null ? "" : r.fullName()) + " "
                            + (r.email() == null ? "" : r.email()) + " "
                            + (r.flatNumber() == null ? "" : r.flatNumber())).toLowerCase(Locale.ROOT);
                    if (hay.contains(q)) {
                        hits.add(new SearchHit(
                                "RESIDENT",
                                r.id(),
                                r.fullName(),
                                (r.flatNumber() != null ? "Flat " + r.flatNumber() + " · " : "") + r.email(),
                                "/residents/" + r.id()
                        ));
                    }
                    if (hits.size() >= LIMIT) {
                        return new SearchResponse(rawQuery.trim(), hits);
                    }
                }
            } catch (Exception ignored) {
                /* scope / ACL miss — skip */
            }
        }

        if (canFlats) {
            try {
                for (var f : property.societyFlats(actor, apartmentId)) {
                    String status = String.valueOf(f.status());
                    String hay = (f.flatNumber() + " " + status).toLowerCase(Locale.ROOT);
                    if (hay.contains(q)) {
                        hits.add(new SearchHit(
                                "FLAT",
                                f.id(),
                                f.flatNumber(),
                                status,
                                "/property/flats/" + f.id()
                        ));
                    }
                    if (hits.size() >= LIMIT) {
                        return new SearchResponse(rawQuery.trim(), hits);
                    }
                }
            } catch (Exception ignored) {
                /* scope / ACL miss — skip */
            }
        }

        if (canBills) {
            try {
                for (var b : billing.all(actor, apartmentId)) {
                    String hay = (b.flatNumber() + " " + b.billType() + " " + b.billingPeriod() + " " + b.status())
                            .toLowerCase(Locale.ROOT);
                    if (hay.contains(q)) {
                        hits.add(new SearchHit(
                                "BILL",
                                b.id(),
                                b.billType() + " · " + b.flatNumber(),
                                b.billingPeriod() + " · balance " + b.balance(),
                                b.balance().signum() > 0 ? "/payments" : "/receipts"
                        ));
                    }
                    if (hits.size() >= LIMIT) {
                        return new SearchResponse(rawQuery.trim(), hits);
                    }
                }
            } catch (Exception ignored) {
                /* scope / ACL miss — skip */
            }
        }

        return new SearchResponse(rawQuery.trim(), hits);
    }
}
