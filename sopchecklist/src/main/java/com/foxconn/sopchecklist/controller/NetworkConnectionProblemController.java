package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.NetworkConnection;
import com.foxconn.sopchecklist.entity.NetworkConnectionProblem;
import com.foxconn.sopchecklist.entity.NetworkConnectionFile;
import com.foxconn.sopchecklist.entity.NetworkConnectionPermission;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.NetworkConnectionProblemRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionFileRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionPermissionRepository;
import com.foxconn.sopchecklist.service.UsersService;
import com.foxconn.sopchecklist.service.NetworkConnectionFileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/network-connection-problems")
@CrossOrigin
public class NetworkConnectionProblemController {

    private final NetworkConnectionProblemRepository repository;
    private final NetworkConnectionRepository connectionRepository;
    private final NetworkConnectionFileRepository fileRepository;
    private final NetworkConnectionFileStorageService storageService;
    private final NetworkConnectionPermissionRepository permissionRepository;
    private final UsersService usersService;

    public NetworkConnectionProblemController(
            NetworkConnectionProblemRepository repository,
            NetworkConnectionRepository connectionRepository,
            NetworkConnectionFileRepository fileRepository,
            NetworkConnectionFileStorageService storageService,
            NetworkConnectionPermissionRepository permissionRepository,
            UsersService usersService
    ) {
        this.repository = repository;
        this.connectionRepository = connectionRepository;
        this.fileRepository = fileRepository;
        this.storageService = storageService;
        this.permissionRepository = permissionRepository;
        this.usersService = usersService;
    }

    private LocalDateTime parseIsoDateTime(String iso) {
        if (iso == null || iso.isBlank()) {
            return null;
        }
        try {
            Instant instant = Instant.parse(iso.trim());
            return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping
    public ResponseEntity<List<NetworkConnectionProblem>> findAll(
            @RequestParam(value = "networkConnectionId", required = false) Long networkConnectionId,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "owner", required = false) String owner,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "startDate", required = false) String startDate,
            @RequestParam(value = "endDate", required = false) String endDate
    ) {
        Map<String, Boolean> perms = getMyPermissions();
        if (!perms.getOrDefault("view", false)) {
            return ResponseEntity.status(403).build();
        }

        List<NetworkConnectionProblem> base;

        if (networkConnectionId == null) {
            base = repository.findAll();
        } else {
            Optional<NetworkConnection> opt = connectionRepository.findById(networkConnectionId);
            if (opt.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }
            base = repository.findByNetworkConnectionOrderByCreatedAtDesc(opt.get());
        }

        String normalizedSearch = search != null && !search.isBlank() ? search.trim().toLowerCase() : null;
        String normalizedOwner = owner != null && !owner.isBlank() ? owner.trim().toLowerCase() : null;
        String normalizedStatus = status != null && !status.isBlank() ? status.trim().toUpperCase() : null;

        LocalDateTime start = parseIsoDateTime(startDate);
        LocalDateTime end = parseIsoDateTime(endDate);

        List<NetworkConnectionProblem> filtered = base.stream()
                .filter(p -> {
                    if (normalizedSearch == null) return true;
                    String content = p.getProblemContent();
                    if (content == null) return false;
                    return content.toLowerCase().contains(normalizedSearch);
                })
                .filter(p -> {
                    if (normalizedOwner == null) return true;
                    String o = p.getOwner();
                    if (o == null) return false;
                    return o.toLowerCase().contains(normalizedOwner);
                })
                .filter(p -> {
                    if (normalizedStatus == null) return true;
                    String st = p.getStatus();
                    if (st == null) return false;
                    return st.trim().toUpperCase().equals(normalizedStatus);
                })
                .filter(p -> {
                    if (start == null) return true;
                    LocalDateTime st = p.getStartTime();
                    if (st == null) return false;
                    return !st.isBefore(start);
                })
                .filter(p -> {
                    if (end == null) return true;
                    LocalDateTime st = p.getStartTime();
                    if (st == null) return false;
                    return !st.isAfter(end);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/{id}")
    public ResponseEntity<NetworkConnectionProblem> findOne(@PathVariable Long id) {
        Map<String, Boolean> perms = getMyPermissions();
        if (!perms.getOrDefault("view", false)) {
            return ResponseEntity.status(403).build();
        }
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody NetworkConnectionProblem body) {
        Map<String, Boolean> perms = getMyPermissions();
        if (!perms.getOrDefault("create", false)) {
            return ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN", "message", "Bạn không có quyền tạo mới sự cố Network Connection"));
        }
        if (body.getNetworkConnection() == null || body.getNetworkConnection().getId() == null) {
            return ResponseEntity.badRequest().body("networkConnection.id is required");
        }
        Optional<NetworkConnection> opt = connectionRepository.findById(body.getNetworkConnection().getId());
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body("NetworkConnection not found");
        }
        body.setId(null);
        body.setNetworkConnection(opt.get());
        if (body.getCreatedAt() == null) body.setCreatedAt(LocalDateTime.now());
        NetworkConnectionProblem created = repository.save(body);
        return ResponseEntity.created(URI.create("/api/network-connection-problems/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> replace(@PathVariable Long id, @RequestBody NetworkConnectionProblem incoming) {
        Map<String, Boolean> perms = getMyPermissions();
        if (!perms.getOrDefault("edit", false)) {
            return ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN", "message", "Bạn không có quyền sửa sự cố Network Connection"));
        }
        return repository.findById(id).map(existed -> {
            existed.setProblemContent(incoming.getProblemContent());
            existed.setOwner(incoming.getOwner());
            existed.setCooperator(incoming.getCooperator());
            existed.setStartTime(incoming.getStartTime());
            existed.setEndTime(incoming.getEndTime());
            existed.setStatus(incoming.getStatus());
            existed.setNote(incoming.getNote());
            existed.setUpdatedBy(incoming.getUpdatedBy());
            existed.setUpdatedAt(LocalDateTime.now());

            if (incoming.getNetworkConnection() != null && incoming.getNetworkConnection().getId() != null) {
                connectionRepository.findById(incoming.getNetworkConnection().getId())
                        .ifPresent(existed::setNetworkConnection);
            }

            NetworkConnectionProblem saved = repository.save(existed);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Map<String, Boolean> perms = getMyPermissions();
        if (!perms.getOrDefault("del", false)) {
            return ResponseEntity.status(403).build();
        }
        Optional<NetworkConnectionProblem> opt = repository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        NetworkConnectionProblem problem = opt.get();
        List<NetworkConnectionFile> files =
                fileRepository.findByNetworkConnectionProblemIdOrderByCreatedAtDesc(problem.getId());
        if (files != null && !files.isEmpty()) {
            for (NetworkConnectionFile f : files) {
                try {
                    storageService.deleteForNetworkConnectionProblemByUrl(f.getFilePath());
                } catch (Exception ignored) {
                }
            }
            fileRepository.deleteAll(files);
        }

        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Boolean> getMyPermissions() {
        Users me = usersService.getCurrentAuthenticatedUser();
        Map<String, Boolean> result = new HashMap<>();
        result.put("view", false);
        result.put("edit", false);
        result.put("del", false);
        result.put("create", false);

        if (me == null) {
            return result;
        }

        boolean isAdmin = me.getRoles() != null && me.getRoles().stream().anyMatch(r -> {
            String n = r.getName();
            return "ADMIN".equalsIgnoreCase(n);
        });
        if (isAdmin) {
            result.put("view", true);
            result.put("edit", true);
            result.put("del", true);
            result.put("create", true);
            return result;
        }

        List<Long> groupIds = (me.getGroups() == null)
                ? Collections.emptyList()
                : me.getGroups().stream().map(g -> g.getId()).collect(Collectors.toList());

        List<NetworkConnectionPermission> userPerms = permissionRepository.findByUserId(me.getUserID().longValue());
        List<NetworkConnectionPermission> groupPerms = groupIds.isEmpty()
                ? Collections.emptyList()
                : permissionRepository.findByGroupIdIn(groupIds);

        for (NetworkConnectionPermission p : userPerms) {
            if (p.isView()) result.put("view", true);
            if (p.isEdit()) result.put("edit", true);
            if (p.isDel()) result.put("del", true);
            if (p.isCreate()) result.put("create", true);
        }
        for (NetworkConnectionPermission p : groupPerms) {
            if (p.isView()) result.put("view", true);
            if (p.isEdit()) result.put("edit", true);
            if (p.isDel()) result.put("del", true);
            if (p.isCreate()) result.put("create", true);
        }

        return result;
    }
}
