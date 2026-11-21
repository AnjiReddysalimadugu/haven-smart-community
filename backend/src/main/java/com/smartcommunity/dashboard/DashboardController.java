package com.smartcommunity.dashboard;

import com.smartcommunity.auth.AccessGuard;
import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.billing.Bill;
import com.smartcommunity.billing.BillRepository;
import com.smartcommunity.complaint.ComplaintRepository;
import com.smartcommunity.complaint.ComplaintStatus;
import com.smartcommunity.property.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
    private final ApartmentRepository apartments;
    private final BlockRepository blocks;
    private final FlatRepository flats;
    private final BillRepository bills;
    private final ComplaintRepository complaints;
    private final AccessGuard accessGuard;

    public DashboardController(ApartmentRepository apartments, BlockRepository blocks, FlatRepository flats,
                               BillRepository bills, ComplaintRepository complaints, AccessGuard accessGuard) {
        this.apartments = apartments;
        this.blocks = blocks;
        this.flats = flats;
        this.bills = bills;
        this.complaints = complaints;
        this.accessGuard = accessGuard;
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN','STAFF')")
    @GetMapping("/summary")
    public Map<String, Object> summary(@AuthenticationPrincipal UserPrincipal principal) {
        boolean platformWide = accessGuard.isSuperAdmin(principal);
        List<Flat> allFlats = platformWide
                ? flats.findAll()
                : flats.findByApartmentIdOrderByFlatNumber(principal.getApartmentId());
        List<Bill> allBills = platformWide
                ? bills.findAll()
                : bills.findByApartmentIdOrderByCreatedAtDesc(principal.getApartmentId());
        var openComplaints = (platformWide
                ? complaints.findAll()
                : complaints.findByApartmentIdOrderByCreatedAtDesc(principal.getApartmentId()))
                .stream()
                .filter(c -> c.getStatus() != ComplaintStatus.CLOSED && c.getStatus() != ComplaintStatus.RESOLVED)
                .count();

        BigDecimal total = allBills.stream().map(Bill::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paid = allBills.stream().map(Bill::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long occupied = allFlats.stream()
                .filter(f -> f.getStatus() == FlatStatus.OWNER_OCCUPIED || f.getStatus() == FlatStatus.TENANT_OCCUPIED)
                .count();
        long apartmentCount = platformWide ? apartments.count() : 1;
        long blockCount = platformWide
                ? blocks.count()
                : blocks.findByApartmentIdOrderByCode(principal.getApartmentId()).size();

        return Map.of(
                "apartments", apartmentCount,
                "blocks", blockCount,
                "flats", allFlats.size(),
                "occupiedFlats", occupied,
                "availableFlats", allFlats.stream().filter(f -> f.getStatus() == FlatStatus.AVAILABLE).count(),
                "totalBilled", total,
                "collected", paid,
                "pending", total.subtract(paid),
                "openComplaints", openComplaints,
                "role", principal.getRole() == null ? Role.APARTMENT_ADMIN.name() : principal.getRole().name()
        );
    }
}
