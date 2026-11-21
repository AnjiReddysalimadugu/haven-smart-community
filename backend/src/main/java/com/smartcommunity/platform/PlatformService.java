package com.smartcommunity.platform;

import com.smartcommunity.auth.AppUserRepository;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.common.BusinessException;
import com.smartcommunity.common.ResourceNotFoundException;
import com.smartcommunity.property.Apartment;
import com.smartcommunity.property.ApartmentRepository;
import com.smartcommunity.property.FlatRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static com.smartcommunity.platform.PlatformDtos.*;

@Service
public class PlatformService {
    private static final String DEFAULT_FEATURES = "[\"property\",\"billing\",\"visitors\",\"complaints\",\"notices\",\"parking\"]";

    private final SocietySubscriptionRepository subscriptions;
    private final SocietySubscriptionPaymentRepository payments;
    private final ApartmentRepository apartments;
    private final AppUserRepository users;
    private final FlatRepository flats;

    public PlatformService(SocietySubscriptionRepository subscriptions,
                           SocietySubscriptionPaymentRepository payments,
                           ApartmentRepository apartments,
                           AppUserRepository users,
                           FlatRepository flats) {
        this.subscriptions = subscriptions;
        this.payments = payments;
        this.apartments = apartments;
        this.users = users;
        this.flats = flats;
    }

    @Transactional(readOnly = true)
    public PlatformSummaryResponse summary(UserPrincipal actor) {
        requireSuper(actor);
        List<Apartment> allApts = apartments.findAll();
        long activeSocieties = allApts.stream().filter(a -> "ACTIVE".equalsIgnoreCase(a.getStatus())).count();
        List<SubscriptionResponse> rows = new ArrayList<>();
        BigDecimal mrr = BigDecimal.ZERO;
        long subActive = 0;
        long subTrial = 0;
        long subPastDue = 0;

        for (Apartment apt : allApts) {
            SocietySubscription sub = subscriptions.findByApartmentId(apt.getId()).orElse(null);
            if (sub == null) {
                rows.add(emptySubscription(apt));
                continue;
            }
            SubscriptionResponse row = toResponse(sub, apt);
            rows.add(row);
            if ("ACTIVE".equalsIgnoreCase(sub.getStatus())) {
                subActive++;
                mrr = mrr.add(sub.getAmountMonthly());
            } else if ("TRIAL".equalsIgnoreCase(sub.getStatus())) {
                subTrial++;
            } else if ("PAST_DUE".equalsIgnoreCase(sub.getStatus()) || "SUSPENDED".equalsIgnoreCase(sub.getStatus())) {
                subPastDue++;
            }
        }

        BigDecimal collected = payments.sumAllPayments();
        // Rough outstanding: sum of monthly amounts for ACTIVE/PAST_DUE where next due is today or earlier
        BigDecimal outstanding = rows.stream()
                .filter(r -> r.nextDueOn() != null && !r.nextDueOn().isAfter(LocalDate.now()))
                .filter(r -> !"CANCELLED".equalsIgnoreCase(r.status()) && !"TRIAL".equalsIgnoreCase(r.status()))
                .map(SubscriptionResponse::amountMonthly)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new PlatformSummaryResponse(
                activeSocieties,
                allApts.size(),
                users.countByActiveTrue(),
                users.count(),
                flats.count(),
                mrr,
                collected,
                outstanding,
                subActive,
                subTrial,
                subPastDue,
                rows
        );
    }

    @Transactional(readOnly = true)
    public List<SubscriptionResponse> listSubscriptions(UserPrincipal actor) {
        requireSuper(actor);
        return apartments.findAll().stream().map(apt -> {
            SocietySubscription sub = subscriptions.findByApartmentId(apt.getId()).orElse(null);
            return sub == null ? emptySubscription(apt) : toResponse(sub, apt);
        }).toList();
    }

    @Transactional
    public SubscriptionResponse upsert(UUID apartmentId, UpsertSubscriptionRequest req, UserPrincipal actor) {
        requireSuper(actor);
        Apartment apt = apartments.findById(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Society not found"));
        SocietySubscription sub = subscriptions.findByApartmentId(apartmentId).orElse(null);
        if (sub == null) {
            sub = new SocietySubscription(apartmentId, req.planCode(), req.planName(), req.amountMonthly());
            sub.apply(req.planCode(), req.planName(), req.status(), req.amountMonthly(),
                    req.seatsIncluded(),
                    req.featuresJson() == null || req.featuresJson().isBlank() ? DEFAULT_FEATURES : req.featuresJson(),
                    req.paymentLink(), req.nextDueOn(), req.notes());
        } else {
            sub.apply(req.planCode(), req.planName(), req.status(), req.amountMonthly(),
                    req.seatsIncluded(),
                    req.featuresJson() == null ? sub.getFeaturesJson() : req.featuresJson(),
                    req.paymentLink(), req.nextDueOn(), req.notes());
        }
        return toResponse(subscriptions.save(sub), apt);
    }

    @Transactional
    public SubscriptionPaymentResponse recordPayment(UUID apartmentId, RecordPlatformPaymentRequest req,
                                                     UserPrincipal actor) {
        requireSuper(actor);
        SocietySubscription sub = subscriptions.findByApartmentId(apartmentId)
                .orElseThrow(() -> new BusinessException("Create a subscription plan for this society first"));
        SocietySubscriptionPayment pay = new SocietySubscriptionPayment(
                sub.getId(), req.amount(), req.paidOn(), req.method(), req.reference(), req.notes());
        pay = payments.save(pay);
        // Mark active + push due date ~30 days when payment recorded
        LocalDate next = req.paidOn().plusMonths(1);
        sub.apply(null, null, "ACTIVE", null, null, null, null, next, null);
        subscriptions.save(sub);
        return new SubscriptionPaymentResponse(
                pay.getId(), pay.getAmount(), pay.getCurrency(), pay.getPaidOn(),
                pay.getMethod(), pay.getReference(), pay.getNotes());
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPaymentResponse> listPayments(UUID apartmentId, UserPrincipal actor) {
        requireSuper(actor);
        SocietySubscription sub = subscriptions.findByApartmentId(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("No subscription for society"));
        return payments.findBySubscriptionIdOrderByPaidOnDesc(sub.getId()).stream()
                .map(p -> new SubscriptionPaymentResponse(
                        p.getId(), p.getAmount(), p.getCurrency(), p.getPaidOn(),
                        p.getMethod(), p.getReference(), p.getNotes()))
                .toList();
    }

    private SubscriptionResponse toResponse(SocietySubscription sub, Apartment apt) {
        BigDecimal collected = payments.sumBySubscription(sub.getId());
        return new SubscriptionResponse(
                sub.getId(),
                apt.getId(),
                apt.getName(),
                sub.getPlanCode(),
                sub.getPlanName(),
                sub.getStatus(),
                sub.getAmountMonthly(),
                sub.getCurrency(),
                sub.getSeatsIncluded(),
                sub.getFeaturesJson(),
                sub.getPaymentLink(),
                sub.getNextDueOn(),
                sub.getNotes(),
                collected,
                users.countByApartmentIdAndActiveTrue(apt.getId()),
                users.countByApartmentId(apt.getId())
        );
    }

    private SubscriptionResponse emptySubscription(Apartment apt) {
        return new SubscriptionResponse(
                null, apt.getId(), apt.getName(),
                "NONE", "No plan", "NONE",
                BigDecimal.ZERO, "INR", 0, "[]", null, null, null,
                BigDecimal.ZERO,
                users.countByApartmentIdAndActiveTrue(apt.getId()),
                users.countByApartmentId(apt.getId())
        );
    }

    private static void requireSuper(UserPrincipal actor) {
        if (actor == null || actor.getRole() != com.smartcommunity.auth.Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Platform console is for Super Admin only");
        }
    }
}
