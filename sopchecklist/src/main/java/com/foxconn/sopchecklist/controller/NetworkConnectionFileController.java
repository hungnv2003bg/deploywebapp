package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.NetworkConnection;
import com.foxconn.sopchecklist.entity.NetworkConnectionFile;
import com.foxconn.sopchecklist.entity.NetworkConnectionProblem;
import com.foxconn.sopchecklist.repository.NetworkConnectionFileRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionProblemRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionRepository;
import com.foxconn.sopchecklist.service.NetworkConnectionFileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/network-connection-files")
@CrossOrigin
public class NetworkConnectionFileController {

    private final NetworkConnectionFileRepository fileRepository;
    private final NetworkConnectionRepository connectionRepository;
    private final NetworkConnectionProblemRepository problemRepository;
    private final NetworkConnectionFileStorageService storageService;

    public NetworkConnectionFileController(
            NetworkConnectionFileRepository fileRepository,
            NetworkConnectionRepository connectionRepository,
            NetworkConnectionProblemRepository problemRepository,
            NetworkConnectionFileStorageService storageService
    ) {
        this.fileRepository = fileRepository;
        this.connectionRepository = connectionRepository;
        this.problemRepository = problemRepository;
        this.storageService = storageService;
    }

    private String resolveFileType(org.springframework.web.multipart.MultipartFile file) {
        String name = file.getOriginalFilename();
        if (name != null) {
            int dot = name.lastIndexOf('.');
            if (dot >= 0 && dot < name.length() - 1) {
                String ext = name.substring(dot + 1).toLowerCase();
                if (ext.length() > 50) {
                    return ext.substring(ext.length() - 50);
                }
                return ext;
            }
        }
        String contentType = file.getContentType();
        if (contentType == null) return null;
        if (contentType.length() > 50) {
            return contentType.substring(0, 50);
        }
        return contentType;
    }

    @GetMapping
    public ResponseEntity<List<NetworkConnectionFile>> list(
            @RequestParam(value = "networkConnectionId", required = false) Long networkConnectionId,
            @RequestParam(value = "networkConnectionProblemId", required = false) Long networkConnectionProblemId
    ) {
        if (networkConnectionProblemId != null) {
            return ResponseEntity.ok(fileRepository.findByNetworkConnectionProblemIdOrderByCreatedAtDesc(networkConnectionProblemId));
        }
        if (networkConnectionId != null) {
            return ResponseEntity.ok(fileRepository.findByNetworkConnectionIdOrderByCreatedAtDesc(networkConnectionId));
        }
        return ResponseEntity.ok(new ArrayList<>());
    }

    @PostMapping("/upload/network-connection/{networkConnectionId}")
    public ResponseEntity<?> uploadForNetworkConnection(
            @PathVariable Long networkConnectionId,
            @RequestParam("files") List<MultipartFile> files
    ) {
        Optional<NetworkConnection> opt = connectionRepository.findById(networkConnectionId);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body("NetworkConnection not found");
        }
        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body("files is required");
        }

        NetworkConnection nc = opt.get();
        List<NetworkConnectionFile> saved = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;
            try {
                String folder = "nc_" + networkConnectionId;
                String url = storageService.storeForNetworkConnection(file, folder);

                NetworkConnectionFile row = new NetworkConnectionFile();
                row.setCreatedAt(LocalDateTime.now());
                row.setFileName(file.getOriginalFilename());
                row.setFilePath(url);
                row.setFileSize(file.getSize());
                row.setFileType(resolveFileType(file));
                row.setNetworkConnection(nc);
                row.setNetworkConnectionProblem(null);
                saved.add(fileRepository.save(row));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Upload failed: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/upload/network-connection-problem/{problemId}")
    public ResponseEntity<?> uploadForProblem(
            @PathVariable Long problemId,
            @RequestParam("files") List<MultipartFile> files
    ) {
        Optional<NetworkConnectionProblem> opt = problemRepository.findById(problemId);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body("NetworkConnectionProblem not found");
        }
        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body("files is required");
        }

        NetworkConnectionProblem problem = opt.get();
        List<NetworkConnectionFile> saved = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;
            try {
                String folder = "problem_" + problemId;
                String url = storageService.storeForNetworkConnectionProblem(file, folder);

                NetworkConnectionFile row = new NetworkConnectionFile();
                row.setCreatedAt(LocalDateTime.now());
                row.setFileName(file.getOriginalFilename());
                row.setFilePath(url);
                row.setFileSize(file.getSize());
                row.setFileType(resolveFileType(file));
                row.setNetworkConnection(null);
                row.setNetworkConnectionProblem(problem);
                saved.add(fileRepository.save(row));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Upload failed: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Optional<NetworkConnectionFile> opt = fileRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        NetworkConnectionFile file = opt.get();
        try {
            if (file.getNetworkConnectionProblem() != null) {
                storageService.deleteForNetworkConnectionProblemByUrl(file.getFilePath());
            } else {
                storageService.deleteForNetworkConnectionByUrl(file.getFilePath());
            }
        } catch (Exception ignored) {
        }
        fileRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
