package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.service.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin
public class UploadController {

    private static final Logger logger = LoggerFactory.getLogger(UploadController.class);
    
    private final FileStorageService storageService;
    
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    // No FTP configuration needed - using local storage only

    public UploadController(FileStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "sopName", required = false) String sopName,
                                    @RequestParam(value = "sopDocumentName", required = false) String sopDocumentName) {
        try {
            String preferredFolder = (sopDocumentName != null && !sopDocumentName.isEmpty())
                    ? sopDocumentName
                    : sopName;
            String url = storageService.storeInFolder(file, preferredFolder);
            Map<String, Object> body = new HashMap<>();
            body.put("url", url);
            body.put("name", file.getOriginalFilename());
            
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("Backend is running!");
    }

    @GetMapping("/file/**")
    public ResponseEntity<Resource> downloadFile(HttpServletRequest request) {
        try {
            String requestURI = request.getRequestURI();
            String filePath = requestURI.substring(requestURI.indexOf("/file/") + 6);
            // Serve from local storage
            Path uploadDirPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path file = uploadDirPath.resolve(filePath).normalize();
            
            if (!file.startsWith(uploadDirPath)) {
                logger.warn("Path traversal attempt detected: {}", filePath);
                return ResponseEntity.badRequest().build();
            }
            
            Resource resource = new UrlResource(file.toUri());
            
            logger.info("Trying to download file: {}", file.toString());
            logger.info("File exists: {}", resource.exists());
            
            if (resource.exists() && resource.isReadable()) {
                String contentType = Files.probeContentType(file);
                if (contentType == null) {
                    contentType = guessContentType(file.getFileName().toString());
                }
                
                logger.info("Detected content type: {}", contentType);
                
                String fileName = file.getFileName().toString();
                String encodedFileName = java.net.URLEncoder.encode(fileName, "UTF-8")
                    .replaceAll("\\+", "%20");
                
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedFileName)
                        .body(resource);
            } else {
                logger.warn("File not found: {}", file.toString());
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Download error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    // FTP methods removed - using local storage only

    private String guessContentType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".txt")) return "application/octet-stream";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (lower.endsWith(".doc")) return "application/msword";
        if (lower.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
        if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }
}



