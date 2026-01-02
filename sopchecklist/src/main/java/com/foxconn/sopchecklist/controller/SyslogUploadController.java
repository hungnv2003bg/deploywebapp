package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.service.SyslogFileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/syslog-upload")
@CrossOrigin
public class SyslogUploadController {

    private static final Logger logger = LoggerFactory.getLogger(SyslogUploadController.class);
    
    private final SyslogFileStorageService storageService;

    public SyslogUploadController(SyslogFileStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "severity", required = false) String severity) {
        try {
            // Use severity as folder name, default to "syslog" if not provided
            String preferredFolder = (severity != null && !severity.isEmpty())
                    ? severity.toLowerCase()
                    : "syslog";
            
            String url = storageService.storeInFolder(file, preferredFolder);
            Map<String, Object> body = new HashMap<>();
            body.put("url", url);
            body.put("name", file.getOriginalFilename());
            
            logger.info("Syslog file uploaded successfully: {} to folder: {}", file.getOriginalFilename(), preferredFolder);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            logger.error("Syslog upload error: {}", e.getMessage(), e);
            Map<String, Object> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}

