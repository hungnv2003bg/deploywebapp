package com.foxconn.sopchecklist.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Controller to serve files from local storage
 * No FTP - all files served from local filesystem
 */
@RestController
@CrossOrigin
public class FilesController {

    private static final Logger logger = LoggerFactory.getLogger(FilesController.class);
    
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @GetMapping("/files/**")
    public ResponseEntity<Resource> serveFile(HttpServletRequest request) {
        try {
            String requestURI = request.getRequestURI();
            String filePath = requestURI.substring(requestURI.indexOf("/files/") + 7);
            
            // Decode URL to handle encoded characters (spaces, special chars, Vietnamese)
            try {
                filePath = java.net.URLDecoder.decode(filePath, "UTF-8");
            } catch (Exception decodeEx) {
                logger.warn("Failed to decode URL, using original: {}", filePath);
            }
            
            logger.info("Serving file request. Original URI: {}, Decoded path: {}", requestURI, filePath);
            
            return serveFileFromLocal(filePath);
        } catch (Exception e) {
            logger.error("File serving error. URI: {}, Error: {}", request.getRequestURI(), e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    private ResponseEntity<Resource> serveFileFromLocal(String filePath) {
        try {
            Path rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path file = rootLocation.resolve(filePath).normalize();
            
            // Security check: ensure file is within upload directory
            if (!file.startsWith(rootLocation)) {
                logger.error("Path traversal attempt detected: {}", filePath);
                return ResponseEntity.badRequest().build();
            }
            
            if (!Files.exists(file) || !Files.isReadable(file)) {
                logger.error("File not found or not readable: {}", file);
                return ResponseEntity.notFound().build();
            }
            
            Resource resource = new UrlResource(file.toUri());
            String fileName = file.getFileName().toString();
            String contentType = getContentType(fileName);
            String encodedFileName = java.net.URLEncoder.encode(fileName, "UTF-8")
                .replaceAll("\\+", "%20");
            
            logger.info("Successfully serving file from local storage: {}", filePath);
            
            // Determine if file should be displayed inline (PDF, images) or downloaded (other files)
            boolean isDisplayable = contentType.startsWith("image/") || 
                                   contentType.equals("application/pdf") ||
                                   contentType.equals("text/plain");
            
            String contentDisposition;
            if (isDisplayable) {
                // Display inline for PDF and images
                contentDisposition = "inline; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedFileName;
            } else {
                // Download for other file types
                contentDisposition = "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedFileName;
            }
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                    .body(resource);
                    
        } catch (Exception e) {
            logger.error("File serving error: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }
    
    private String getContentType(String fileName) {
        String lowerFileName = fileName.toLowerCase();
        if (lowerFileName.endsWith(".txt")) {
            return "application/octet-stream";
        } else if (lowerFileName.endsWith(".pdf")) {
            return "application/pdf";
        } else if (lowerFileName.endsWith(".docx")) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else if (lowerFileName.endsWith(".doc")) {
            return "application/msword";
        } else if (lowerFileName.endsWith(".pptx")) {
            return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        } else if (lowerFileName.endsWith(".ppt")) {
            return "application/vnd.ms-powerpoint";
        } else if (lowerFileName.endsWith(".xlsx")) {
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else if (lowerFileName.endsWith(".xls")) {
            return "application/vnd.ms-excel";
        } else if (lowerFileName.endsWith(".png")) {
            return "image/png";
        } else if (lowerFileName.endsWith(".jpg") || lowerFileName.endsWith(".jpeg")) {
            return "image/jpeg";
        } else {
            return "application/octet-stream";
        }
    }
}
