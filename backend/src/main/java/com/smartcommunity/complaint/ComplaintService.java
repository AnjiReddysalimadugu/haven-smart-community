package com.smartcommunity.complaint;

import com.smartcommunity.audit.AuditService;
import com.smartcommunity.auth.AccessGuard;
import com.smartcommunity.auth.AppUser;
import com.smartcommunity.auth.AppUserRepository;
import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.common.*;
import com.smartcommunity.notify.PushNotificationService;
import com.smartcommunity.property.Flat;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.smartcommunity.complaint.ComplaintDtos.*;

@Service
@Transactional
public class ComplaintService {
    private static final Map<ComplaintStatus, Set<ComplaintStatus>> ALLOWED = Map.of(
            ComplaintStatus.RAISED, EnumSet.of(ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.CLOSED),
            ComplaintStatus.ASSIGNED, EnumSet.of(ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED),
            ComplaintStatus.IN_PROGRESS, EnumSet.of(ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.ASSIGNED),
            ComplaintStatus.RESOLVED, EnumSet.of(ComplaintStatus.CLOSED, ComplaintStatus.REOPENED),
            ComplaintStatus.CLOSED, EnumSet.of(ComplaintStatus.REOPENED),
            ComplaintStatus.REOPENED, EnumSet.of(ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.CLOSED)
    );

    private final ComplaintRepository repo;
    private final ComplaintCommentRepository comments;
    private final ComplaintStatusHistoryRepository history;
    private final AppUserRepository users;
    private final AccessGuard accessGuard;
    private final PushNotificationService push;
    private final AuditService audit;

    public ComplaintService(ComplaintRepository repo, ComplaintCommentRepository comments,
                            ComplaintStatusHistoryRepository history, AppUserRepository users,
                            AccessGuard accessGuard, PushNotificationService push, AuditService audit) {
        this.repo = repo;
        this.comments = comments;
        this.history = history;
        this.users = users;
        this.accessGuard = accessGuard;
        this.push = push;
        this.audit = audit;
    }

    public Response create(CreateRequest r, UserPrincipal actor) {
        UUID flatId = actor.getRole() == Role.RESIDENT ? actor.getFlatId() : r.flatId();
        if (flatId == null) {
            throw new InvalidRequestException("A flat is required to raise a request");
        }
        Flat flat = accessGuard.requireAccessibleFlat(actor, flatId);
        Complaint saved = repo.save(new Complaint(flat, r.title(), r.category().toUpperCase(), r.description()));
        history.save(new ComplaintStatusHistory(
                saved.getId(), null, ComplaintStatus.RAISED, actor.getId(), actor.getFullName(), "Ticket raised"));
        UUID aptId = flat.getFloor().getBlock().getApartment().getId();
        audit.record(actor, "COMPLAINT_CREATE", "COMPLAINT", saved.getId(),
                "Raised: " + saved.getTitle(), aptId);
        return map(saved);
    }

    public Response update(UUID id, StatusRequest r, UserPrincipal actor) {
        Complaint complaint = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));
        accessGuard.requireAccessibleFlat(actor, complaint.getFlat().getId());

        ComplaintStatus from = complaint.getStatus();
        ComplaintStatus to = r.status();
        if (from != to) {
            Set<ComplaintStatus> allowed = ALLOWED.getOrDefault(from, Set.of());
            if (!allowed.contains(to)) {
                throw new InvalidRequestException("Cannot move ticket from " + from + " to " + to);
            }
            complaint.setStatus(to);
            history.save(new ComplaintStatusHistory(
                    complaint.getId(), from, to, actor.getId(), actor.getFullName(), r.resolutionNotes()));
        }

        if (r.assigneeUserId() != null) {
            AppUser assignee = users.findById(r.assigneeUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));
            Role ar = assignee.getRole();
            if (ar != Role.STAFF && ar != Role.APARTMENT_ADMIN && ar != Role.ADMIN && ar != Role.SUPER_ADMIN) {
                throw new InvalidRequestException("Assignee must be staff or an administrator");
            }
            if (actor.getApartmentId() != null && assignee.getApartmentId() != null
                    && !actor.getApartmentId().equals(assignee.getApartmentId())
                    && !accessGuard.isSuperAdmin(actor)) {
                throw new InvalidRequestException("Assignee belongs to a different society");
            }
            complaint.setAssigneeUserId(assignee.getId());
            if (complaint.getStatus() == ComplaintStatus.RAISED) {
                complaint.setStatus(ComplaintStatus.ASSIGNED);
                history.save(new ComplaintStatusHistory(
                        complaint.getId(), ComplaintStatus.RAISED, ComplaintStatus.ASSIGNED,
                        actor.getId(), actor.getFullName(), "Assigned to " + assignee.getFullName()));
            }
        }
        if (r.resolutionNotes() != null) {
            complaint.setResolutionNotes(r.resolutionNotes().isBlank() ? null : r.resolutionNotes().trim());
        }
        if (r.evidenceUrl() != null) {
            complaint.setEvidenceUrl(sanitizeEvidenceUrl(r.evidenceUrl()));
        }

        UUID aptId = complaint.getFlat().getFloor().getBlock().getApartment().getId();
        audit.record(actor, "COMPLAINT_UPDATE", "COMPLAINT", complaint.getId(),
                "Status " + complaint.getStatus(), aptId);

        users.findFirstByFlatIdAndRoleAndActiveTrue(complaint.getFlat().getId(), Role.RESIDENT).ifPresent(resident ->
                push.sendToUser(resident.getId(), "Ticket update",
                        complaint.getTitle() + " → " + complaint.getStatus(),
                        java.util.Map.of("type", "complaint", "complaintId", complaint.getId().toString())));
        return map(complaint);
    }

    public CommentResponse addComment(UUID id, CommentRequest r, UserPrincipal actor) {
        Complaint complaint = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));
        accessGuard.requireAccessibleFlat(actor, complaint.getFlat().getId());
        ComplaintComment comment = comments.save(new ComplaintComment(
                complaint.getId(), actor.getId(), actor.getFullName(), r.body().trim()));
        return new CommentResponse(comment.getId(), comment.getAuthorUserId(), comment.getAuthorName(),
                comment.getBody(), comment.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public List<Response> all(UserPrincipal actor, UUID apartmentId, boolean mineOnly) {
        if (mineOnly && actor.getRole() == Role.STAFF) {
            return repo.findByAssigneeUserIdOrderByCreatedAtDesc(actor.getId()).stream().map(this::map).toList();
        }
        return scoped(actor, apartmentId).stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<Response> page(UserPrincipal actor, UUID apartmentId, int page, int size, boolean mineOnly) {
        return PageResponse.of(all(actor, apartmentId, mineOnly), page, size);
    }

    private List<Complaint> scoped(UserPrincipal actor, UUID apartmentId) {
        if (actor.getRole() == Role.RESIDENT) {
            if (actor.getFlatId() == null) return List.of();
            return repo.findByFlatIdOrderByCreatedAtDesc(actor.getFlatId());
        }
        if (accessGuard.isSuperAdmin(actor)) {
            if (apartmentId != null) {
                return repo.findByApartmentIdOrderByCreatedAtDesc(apartmentId);
            }
            return repo.findAllByOrderByCreatedAtDesc();
        }
        if (actor.getApartmentId() != null) {
            return repo.findByApartmentIdOrderByCreatedAtDesc(actor.getApartmentId());
        }
        return List.of();
    }

    private Response map(Complaint c) {
        String assigneeName = null;
        if (c.getAssigneeUserId() != null) {
            assigneeName = users.findById(c.getAssigneeUserId()).map(AppUser::getFullName).orElse(null);
        }
        List<CommentResponse> thread = comments.findByComplaintIdOrderByCreatedAtAsc(c.getId()).stream()
                .map(cm -> new CommentResponse(cm.getId(), cm.getAuthorUserId(), cm.getAuthorName(),
                        cm.getBody(), cm.getCreatedAt()))
                .toList();
        List<HistoryResponse> hist = history.findByComplaintIdOrderByCreatedAtAsc(c.getId()).stream()
                .map(h -> new HistoryResponse(h.getId(), h.getFromStatus(), h.getToStatus(),
                        h.getActorName(), h.getNote(), h.getCreatedAt()))
                .toList();
        return new Response(
                c.getId(), c.getFlat().getId(), c.getFlat().getFlatNumber(), c.getTitle(),
                c.getCategory(), c.getDescription(), c.getStatus(),
                c.getAssigneeUserId(), assigneeName, c.getResolutionNotes(), c.getEvidenceUrl(),
                c.getCreatedAt(), thread, hist
        );
    }

    /** Allow only Haven upload paths or https image URLs — blocks javascript:/data: XSS. */
    static String sanitizeEvidenceUrl(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String url = raw.trim();
        if (url.matches("(?i)^/api/v1/uploads/[a-f0-9]{32}\\.(jpg|jpeg|png|webp|gif)$")) {
            return url;
        }
        if (url.matches("(?i)^https://[\\w.-]+(?:\\.[\\w.-]+)+(?:/[^\\s]*)?$")
                && !url.toLowerCase().contains("javascript:")) {
            return url.length() > 1000 ? url.substring(0, 1000) : url;
        }
        throw new InvalidRequestException(
                "Evidence must be a Haven upload (/api/v1/uploads/…) or an https:// image URL");
    }
}
