package com.smartcommunity.upload;

import com.smartcommunity.common.InvalidRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/uploads")
public class UploadController {
    private static final Set<String> ALLOWED = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final Path root;

    public UploadController(@Value("${app.upload.dir:uploads}") String uploadDir) throws IOException {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(this.root);
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new InvalidRequestException("Choose an image file to upload");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new InvalidRequestException("Image must be 5 MB or smaller");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!ALLOWED.contains(contentType)) {
            throw new InvalidRequestException("Only JPEG, PNG, WebP, or GIF images are allowed");
        }
        String ext = switch (contentType) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/gif" -> "gif";
            default -> "jpg";
        };
        byte[] bytes = file.getBytes();
        if (!looksLikeImage(bytes, contentType)) {
            throw new InvalidRequestException("File content does not match an allowed image type");
        }
        String name = UUID.randomUUID().toString().replace("-", "") + "." + ext;
        Path target = root.resolve(name).normalize();
        if (!target.startsWith(root)) {
            throw new InvalidRequestException("Invalid upload path");
        }
        Files.write(target, bytes);
        return Map.of(
                "url", "/api/v1/uploads/" + name,
                "contentType", contentType,
                "fileName", name
        );
    }

    @GetMapping("/{fileName}")
    public ResponseEntity<Resource> get(@PathVariable String fileName) throws IOException {
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            return ResponseEntity.notFound().build();
        }
        Path file = root.resolve(fileName).normalize();
        if (!file.startsWith(root) || !Files.exists(file)) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new UrlResource(file.toUri());
        String probe = Files.probeContentType(file);
        MediaType mediaType = probe != null ? MediaType.parseMediaType(probe) : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .header(HttpHeaders.CONTENT_TYPE, mediaType.toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(mediaType)
                .body(resource);
    }

    private static boolean looksLikeImage(byte[] h, String contentType) {
        if (h == null || h.length < 3) return false;
        return switch (contentType) {
            case "image/jpeg" -> (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8;
            case "image/png" -> h.length >= 8
                    && h[0] == (byte) 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47;
            case "image/gif" -> h[0] == 'G' && h[1] == 'I' && h[2] == 'F';
            case "image/webp" -> h.length >= 12
                    && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                    && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P';
            default -> false;
        };
    }
}
