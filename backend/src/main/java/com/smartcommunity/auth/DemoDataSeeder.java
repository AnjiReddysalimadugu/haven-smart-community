package com.smartcommunity.auth;

import com.smartcommunity.billing.Bill;
import com.smartcommunity.billing.BillPayment;
import com.smartcommunity.billing.BillPaymentRepository;
import com.smartcommunity.billing.BillRepository;
import com.smartcommunity.complaint.Complaint;
import com.smartcommunity.complaint.ComplaintRepository;
import com.smartcommunity.parking.ParkingRepository;
import com.smartcommunity.parking.ParkingSlot;
import com.smartcommunity.property.*;
import com.smartcommunity.visitor.VisitorPass;
import com.smartcommunity.visitor.VisitorRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;

@Component
public class DemoDataSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final DemoProperties demoProperties;
    private final ApartmentRepository apartments;
    private final BlockRepository blocks;
    private final FloorRepository floors;
    private final FlatRepository flats;
    private final FlatOccupancyRepository occupancies;
    private final ParkingRepository parking;
    private final BillRepository bills;
    private final BillPaymentRepository payments;
    private final ComplaintRepository complaints;
    private final VisitorRepository visitors;

    public DemoDataSeeder(AppUserRepository users, PasswordEncoder passwordEncoder, DemoProperties demoProperties,
                          ApartmentRepository apartments, BlockRepository blocks, FloorRepository floors,
                          FlatRepository flats, FlatOccupancyRepository occupancies, ParkingRepository parking,
                          BillRepository bills, BillPaymentRepository payments, ComplaintRepository complaints,
                          VisitorRepository visitors) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.demoProperties = demoProperties;
        this.apartments = apartments;
        this.blocks = blocks;
        this.floors = floors;
        this.flats = flats;
        this.occupancies = occupancies;
        this.parking = parking;
        this.bills = bills;
        this.payments = payments;
        this.complaints = complaints;
        this.visitors = visitors;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!demoProperties.isEnabled()) {
            log.info("Demo seeding disabled (app.demo.enabled=false)");
            return;
        }
        if (!StringUtils.hasText(demoProperties.getPassword())) {
            log.warn("DEMO_PASSWORD not set — demo users will not be created/updated");
        }

        Apartment society = apartments.findAll().stream()
                .filter(a -> a.getName().equalsIgnoreCase("Green Valley Residency"))
                .findFirst()
                .orElseGet(() -> apartments.save(new Apartment(
                        "Green Valley Residency",
                        "12 Palm Avenue, Bengaluru",
                        "Asia/Kolkata")));

        Block blockA = blocks.findByApartmentIdOrderByCode(society.getId()).stream()
                .filter(b -> "A".equalsIgnoreCase(b.getCode()))
                .findFirst()
                .orElseGet(() -> blocks.save(new Block(society, "Block A", "A")));

        Floor ground = floors.findByBlockIdOrderByFloorNumber(blockA.getId()).stream()
                .filter(f -> f.getFloorNumber() == 0)
                .findFirst()
                .orElseGet(() -> floors.save(new Floor(blockA, 0, "Ground floor")));

        Floor first = floors.findByBlockIdOrderByFloorNumber(blockA.getId()).stream()
                .filter(f -> f.getFloorNumber() == 1)
                .findFirst()
                .orElseGet(() -> floors.save(new Floor(blockA, 1, "First floor")));

        Flat flatA101 = ensureFlat(ground, "A-101", FlatStatus.OWNER_OCCUPIED);
        Flat flatA102 = ensureFlat(ground, "A-102", FlatStatus.AVAILABLE);
        // Keep seed inventory consistent: only A-101 has a seeded occupancy/resident.
        Flat flatA201 = ensureFlat(first, "A-201", FlatStatus.AVAILABLE);
        Flat flatA202 = ensureFlat(first, "A-202", FlatStatus.AVAILABLE);

        ParkingSlot p01 = ensureParking(society, "P-01", "CAR", "1000");
        ensureParking(society, "P-02", "CAR", "1000");
        ensureParking(society, "P-03", "BIKE", "300");
        ensureParking(society, "P-04", "EV", "1500");
        if (p01 != null && !p01.isAllocated()) {
            p01.allocate(flatA101, "KA01AB1234");
            parking.save(p01);
        }

        if (bills.findByFlatIdOrderByCreatedAtDesc(flatA101.getId()).isEmpty()) {
            bills.save(new Bill(flatA101, "MAINTENANCE", "2026-11", new BigDecimal("4500"), LocalDate.now().plusDays(7)));
            Bill paid = new Bill(flatA201, "MAINTENANCE", "2026-10", new BigDecimal("4500"), LocalDate.now().minusDays(20));
            paid.recordPayment(new BigDecimal("4500"));
            bills.save(paid);
            payments.save(new BillPayment(paid, new BigDecimal("4500"), "UPI", "DEMO-PAID-OCT", "RCPT-DEMO0001"));
        }
        backfillReceipts();

        if (complaints.findByFlatIdOrderByCreatedAtDesc(flatA101.getId()).isEmpty()) {
            complaints.save(new Complaint(flatA101, "Water leakage in bathroom", "PLUMBING",
                    "Continuous drip under the sink since morning."));
            complaints.save(new Complaint(flatA201, "Lift not stopping on first floor", "ELECTRICAL",
                    "Intermittent issue during peak hours."));
        }

        if (visitors.findByFlatIdOrderByCreatedAtDesc(flatA101.getId()).isEmpty()) {
            String token = "demo-" + java.util.UUID.randomUUID().toString().replace("-", "");
            visitors.save(new VisitorPass(flatA101, "Courier Partner", "9876500123", "DELIVERY",
                    sha256(token), Instant.now().plusSeconds(7200),
                    com.smartcommunity.visitor.VisitorApprovalStatus.APPROVED, null));
            log.info("Seeded demo visitor pass for A-101 (token not logged — create a fresh pass in UI for gate tests)");
        }

        // Migrate legacy demo mailbox → real Super Admin inbox (OTP/Google)
        users.findByEmailIgnoreCase("superadmin@haven.local").ifPresent(legacy -> {
            if (users.findByEmailIgnoreCase("anji99121640@gmail.com").isEmpty()) {
                legacy.setEmail("anji99121640@gmail.com");
                users.save(legacy);
            }
        });
        bindUser("anji99121640@gmail.com", "Haven Super Admin", Role.SUPER_ADMIN, null, null);
        bindUser("admin@haven.local", "Arjun Rao", Role.APARTMENT_ADMIN, society.getId(), null);
        bindUser("staff@haven.local", "Meera Iyer", Role.STAFF, society.getId(), null);
        bindUser("security@haven.local", "Ravi Gate", Role.SECURITY, society.getId(), null);
        AppUser resident = bindUser("resident@haven.local", "Priya Nair", Role.RESIDENT, society.getId(), flatA101.getId());
        ensureOccupancy(flatA101, resident, OccupancyType.OWNER);

        log.info("Demo society ready: {} | flats={} | roles=SUPER_ADMIN,APARTMENT_ADMIN,STAFF,SECURITY,RESIDENT",
                society.getName(), List.of(flatA101.getFlatNumber(), flatA102.getFlatNumber(),
                        flatA201.getFlatNumber(), flatA202.getFlatNumber()));
    }

    private Flat ensureFlat(Floor floor, String number, FlatStatus status) {
        return flats.findByFloorIdOrderByFlatNumber(floor.getId()).stream()
                .filter(f -> f.getFlatNumber().equalsIgnoreCase(number))
                .findFirst()
                .map(existing -> {
                    if (existing.getStatus() != status && status != FlatStatus.AVAILABLE) {
                        // keep DB status if already set by occupancy workflows
                        return existing;
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    Flat flat = new Flat(floor, number, new BigDecimal("980"), 2);
                    flat.setStatus(status);
                    return flats.save(flat);
                });
    }

    private ParkingSlot ensureParking(Apartment society, String code, String type, String charge) {
        return parking.findByApartment_IdOrderBySlotCode(society.getId()).stream()
                .filter(p -> p.getSlotCode().equalsIgnoreCase(code))
                .findFirst()
                .orElseGet(() -> parking.save(new ParkingSlot(society, code, type, new BigDecimal(charge))));
    }

    private void backfillReceipts() {
        for (Bill bill : bills.findAllByOrderByCreatedAtDesc()) {
            if (bill.getPaidAmount().signum() <= 0) continue;
            if (payments.existsByBillId(bill.getId())) continue;
            String receipt = "RCPT-" + bill.getId().toString().replace("-", "").substring(0, 10).toUpperCase();
            payments.save(new BillPayment(
                    bill,
                    bill.getPaidAmount(),
                    "UPI",
                    "BACKFILL-" + bill.getBillingPeriod(),
                    receipt
            ));
        }
    }

    private AppUser bindUser(String email, String fullName, Role role, java.util.UUID apartmentId, java.util.UUID flatId) {
        AppUser user = users.findByEmailIgnoreCase(email).orElseGet(() -> {
            if (!StringUtils.hasText(demoProperties.getPassword())) {
                throw new IllegalStateException("DEMO_PASSWORD is required to create demo user " + email);
            }
            return users.save(new AppUser(email, passwordEncoder.encode(demoProperties.getPassword()), fullName, role));
        });
        user.setRole(role);
        user.setFullName(fullName);
        user.setApartmentId(apartmentId);
        user.setFlatId(flatId);
        user.setActive(true);
        if (StringUtils.hasText(demoProperties.getPassword())) {
            user.setPasswordHash(passwordEncoder.encode(demoProperties.getPassword()));
        }
        return users.save(user);
    }

    private void ensureOccupancy(Flat flat, AppUser resident, OccupancyType type) {
        if (occupancies.existsByFlatIdAndStatus(flat.getId(), OccupancyStatus.ACTIVE)) {
            return;
        }
        occupancies.save(new FlatOccupancy(flat.getId(), resident.getId(), type, null, "Seeded demo occupancy"));
        resident.setFlatId(flat.getId());
        users.save(resident);
        flat.setStatus(type == OccupancyType.TENANT ? FlatStatus.TENANT_OCCUPIED : FlatStatus.OWNER_OCCUPIED);
        flats.save(flat);
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
