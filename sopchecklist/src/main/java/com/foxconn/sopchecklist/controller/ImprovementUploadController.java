package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.service.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/improvement-upload")
@CrossOrigin
public class ImprovementUploadController {

    private static final Logger logger = LoggerFactory.getLogger(ImprovementUploadController.class);
    
    private final FileStorageService storageService;

    public ImprovementUploadController(FileStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "improvementName", required = false) String improvementName) {
        try {
            String preferredFolder = (improvementName != null && !improvementName.isEmpty())
                    ? improvementName
                    : "General";
            
            String url = storageService.storeInFolder(file, preferredFolder);
            Map<String, Object> body = new HashMap<>();
            body.put("url", url);
            body.put("name", file.getOriginalFilename());
            
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            logger.error("Improvement upload error: {}", e.getMessage(), e);
            Map<String, Object> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    // File download removed - use /files/** endpoint from FilesController

    // FTP methods removed - using local storage via FileStorageService
}
