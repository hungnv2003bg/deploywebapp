package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.NetworkConnection;
import com.foxconn.sopchecklist.entity.NetworkConnectionArea;
import com.foxconn.sopchecklist.entity.NetworkConnectionContract;
import com.foxconn.sopchecklist.entity.NetworkConnectionLine;
import com.foxconn.sopchecklist.entity.NetworkConnectionProvider;
import com.foxconn.sopchecklist.entity.NetworkConnectionSupport;
import com.foxconn.sopchecklist.entity.NetworkConnectionType;
import com.foxconn.sopchecklist.entity.NetworkConnectionProblem;
import com.foxconn.sopchecklist.entity.NetworkConnectionPermission;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.NetworkConnectionAreaRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionContractRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionLineRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionProviderRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionSupportRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionTypeRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionProblemRepository;
import com.foxconn.sopchecklist.repository.NetworkConnectionPermissionRepository;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Comparator;
import java.util.Collections;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/network-connections")
@CrossOrigin
public class NetworkConnectionController {

    private final NetworkConnectionRepository repository;
    private final NetworkConnectionAreaRepository areaRepository;
    private final NetworkConnectionLineRepository lineRepository;
    private final NetworkConnectionTypeRepository typeRepository;
    private final NetworkConnectionProviderRepository providerRepository;
    private final NetworkConnectionContractRepository contractRepository;
    private final NetworkConnectionSupportRepository supportRepository;
    private final NetworkConnectionProblemRepository problemRepository;
    private final NetworkConnectionPermissionRepository permissionRepository;
    private final UsersService usersService;

    public NetworkConnectionController(
            NetworkConnectionRepository repository,
            NetworkConnectionAreaRepository areaRepository,
            NetworkConnectionLineRepository lineRepository,
            NetworkConnectionTypeRepository typeRepository,
            NetworkConnectionProviderRepository providerRepository,
            NetworkConnectionContractRepository contractRepository,
            NetworkConnectionSupportRepository supportRepository,
            NetworkConnectionProblemRepository problemRepository,
            NetworkConnectionPermissionRepository permissionRepository,
            UsersService usersService
    ) {
        this.repository = repository;
        this.areaRepository = areaRepository;
        this.lineRepository = lineRepository;
        this.typeRepository = typeRepository;
        this.providerRepository = providerRepository;
        this.contractRepository = contractRepository;
        this.supportRepository = supportRepository;
        this.problemRepository = problemRepository;
        this.permissionRepository = permissionRepository;
        this.usersService = usersService;
    }

    @GetMapping
    public ResponseEntity<List<NetworkConnection>> findAll(
            @RequestParam(required = false) Long typeId,
            @RequestParam(required = false) Long providerId,
            @RequestParam(required = false) Long lineId,
            @RequestParam(required = false) String status
    ) {
        Map<String, Boolean> perms = getMyPermissions();
        if (!perms.getOrDefault("view", false)) {
            return ResponseEntity.status(403).build();
        }

        List<NetworkConnection> all = repository.findAll();

        List<NetworkConnection> filtered = all.stream()
                .filter(nc -> {
                    if (typeId == null) return true;
                    if (nc.getConnectionType() == null || nc.getConnectionType().getId() == null) return false;
                    return typeId.equals(nc.getConnectionType().getId());
                })
                .filter(nc -> {
                    if (providerId == null) return true;
                    if (nc.getProvider() == null || nc.getProvider().getId() == null) return false;
                    return providerId.equals(nc.getProvider().getId());
                })
                .filter(nc -> {
                    if (lineId == null) return true;
                    if (nc.getLine() == null || nc.getLine().getId() == null) return false;
                    return lineId.equals(nc.getLine().getId());
                })
                .filter(nc -> {
                    if (status == null || status.isBlank()) return true;
                    if (nc.getStatus() == null) return false;
                    return nc.getStatus().equalsIgnoreCase(status.trim());
                })
                .sorted((a, b) -> {
                    String sa = a.getStatus();
                    String sb = b.getStatus();

                    int ra;
                    if (sa == null) {
                        ra = 2;
                    } else {
                        String up = sa.toUpperCase();
                        if ("ACTIVE".equals(up)) {
                            ra = 0;
                        } else if ("INACTIVE".equals(up)) {
                            ra = 1;
                        } else {
                            ra = 2;
                        }
                    }

                    int rb;
                    if (sb == null) {
                        rb = 2;
                    } else {
                        String up = sb.toUpperCase();
                        if ("ACTIVE".equals(up)) {
                            rb = 0;
                        } else if ("INACTIVE".equals(up)) {
                            rb = 1;
                        } else {
                            rb = 2;
                        }
                    }

                    int cmpStatus = Integer.compare(ra, rb);
                    if (cmpStatus != 0) return cmpStatus;

                    LocalDateTime ca = a.getCreatedAt();
                    LocalDateTime cb = b.getCreatedAt();

                    if (ca == null && cb == null) return 0;
                    if (ca == null) return 1;
                    if (cb == null) return -1;
                    return ca.compareTo(cb);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/{id}")
    public ResponseEntity<NetworkConnection> findOne(@PathVariable Long id) {
        Map<String, Boolean> perms = getMyPermissions();
        if (!perms.getOrDefault("view", false)) {
            return ResponseEntity.status(403).build();
        }
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody NetworkConnection body) {
        Map<String, Boolean> perms = getMyPermissions();
        if (!perms.getOrDefault("create", false)) {
            return ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN", "message", "Bạn không có quyền tạo mới Network Connection"));
        }
        body.setId(null);
        if (body.getCreatedAt() == null) body.setCreatedAt(LocalDateTime.now());

        Map<String, Object> err = new HashMap<>();
        if (!applyRelations(body, err)) {
            return ResponseEntity.badRequest().body(err);
        }

        NetworkConnection created = repository.save(body);
        return ResponseEntity.created(URI.create("/api/network-connections/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> replace(@PathVariable Long id, @RequestBody NetworkConnection incoming) {
        Map<String, Boolean> perms = getMyPermissions();
        if (!perms.getOrDefault("edit", false)) {
            return ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN", "message", "Bạn không có quyền sửa Network Connection"));
        }
        Optional<NetworkConnection> opt = repository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        NetworkConnection existed = opt.get();
        existed.setDetailAddress(incoming.getDetailAddress());
        existed.setResponsibleDepartment(incoming.getResponsibleDepartment());
        existed.setCostCode(incoming.getCostCode());
        existed.setBandwidth(incoming.getBandwidth());
        existed.setChannelCode(incoming.getChannelCode());
        existed.setIpWan(incoming.getIpWan());
        existed.setIpLan(incoming.getIpLan());
        existed.setPrice(incoming.getPrice());
        existed.setPurpose(incoming.getPurpose());
        existed.setNote(incoming.getNote());
        existed.setStatus(incoming.getStatus());
        if (incoming.getUpdatedBy() != null) existed.setUpdatedBy(incoming.getUpdatedBy());
        existed.setUpdatedAt(LocalDateTime.now());

        Map<String, Object> err = new HashMap<>();
        if (!applyRelationsForReplace(existed, incoming, err)) {
            return ResponseEntity.badRequest().body(err);
        }

        NetworkConnection saved = repository.save(existed);
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> patch(@PathVariable Long id, @RequestBody NetworkConnection incoming) {
        Map<String, Boolean> perms = getMyPermissions();
        if (!perms.getOrDefault("edit", false)) {
            return ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN", "message", "Bạn không có quyền sửa Network Connection"));
        }
        Optional<NetworkConnection> opt = repository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        NetworkConnection existed = opt.get();

        if (incoming.getDetailAddress() != null) existed.setDetailAddress(incoming.getDetailAddress());
        if (incoming.getResponsibleDepartment() != null) existed.setResponsibleDepartment(incoming.getResponsibleDepartment());
        if (incoming.getCostCode() != null) existed.setCostCode(incoming.getCostCode());
        if (incoming.getBandwidth() != null) existed.setBandwidth(incoming.getBandwidth());
        if (incoming.getChannelCode() != null) existed.setChannelCode(incoming.getChannelCode());
        if (incoming.getIpWan() != null) existed.setIpWan(incoming.getIpWan());
        if (incoming.getIpLan() != null) existed.setIpLan(incoming.getIpLan());
        if (incoming.getPrice() != null) existed.setPrice(incoming.getPrice());
        if (incoming.getPurpose() != null) existed.setPurpose(incoming.getPurpose());
        if (incoming.getNote() != null) existed.setNote(incoming.getNote());
        if (incoming.getStatus() != null) existed.setStatus(incoming.getStatus());
        if (incoming.getUpdatedBy() != null) existed.setUpdatedBy(incoming.getUpdatedBy());

        Map<String, Object> err = new HashMap<>();
        if (!applyRelationsForPatch(existed, incoming, err)) {
            return ResponseEntity.badRequest().body(err);
        }

        existed.setUpdatedAt(LocalDateTime.now());
        NetworkConnection saved = repository.save(existed);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Map<String, Boolean> perms = getMyPermissions();
        if (!perms.getOrDefault("del", false)) {
            return ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN", "message", "Bạn không có quyền xóa Network Connection"));
        }
        Optional<NetworkConnection> opt = repository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        NetworkConnection connection = opt.get();
        List<NetworkConnectionProblem> problems = problemRepository.findByNetworkConnectionOrderByCreatedAtDesc(connection);
        if (problems != null && !problems.isEmpty()) {
            Map<String, Object> body = new HashMap<>();
            body.put("error", "HAS_PROBLEMS");
            body.put("message", "Không thể xóa Network Connection vì còn sự cố liên quan");
            body.put("problemCount", problems.size());
            return ResponseEntity.badRequest().body(body);
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

    private boolean applyRelations(NetworkConnection target, Map<String, Object> err) {
        try {
            target.setArea(resolveArea(target.getArea()));
            target.setLine(resolveLine(target.getLine()));
            target.setConnectionType(resolveType(target.getConnectionType()));
            target.setProvider(resolveProvider(target.getProvider()));
            target.setContract(resolveContract(target.getContract()));
            target.setSupport(resolveSupport(target.getSupport()));
            return true;
        } catch (IllegalArgumentException iae) {
            err.put("error", "VALIDATION");
            err.put("message", iae.getMessage());
            return false;
        }
    }

    private boolean applyRelationsForReplace(NetworkConnection existed, NetworkConnection incoming, Map<String, Object> err) {
        try {
            existed.setArea(resolveArea(incoming.getArea()));
            existed.setLine(resolveLine(incoming.getLine()));
            existed.setConnectionType(resolveType(incoming.getConnectionType()));
            existed.setProvider(resolveProvider(incoming.getProvider()));
            existed.setContract(resolveContract(incoming.getContract()));
            existed.setSupport(resolveSupport(incoming.getSupport()));
            return true;
        } catch (IllegalArgumentException iae) {
            err.put("error", "VALIDATION");
            err.put("message", iae.getMessage());
            return false;
        }
    }

    private boolean applyRelationsForPatch(NetworkConnection existed, NetworkConnection incoming, Map<String, Object> err) {
        try {
            if (incoming.getArea() != null) existed.setArea(resolveArea(incoming.getArea()));
            if (incoming.getLine() != null) existed.setLine(resolveLine(incoming.getLine()));
            if (incoming.getConnectionType() != null) existed.setConnectionType(resolveType(incoming.getConnectionType()));
            if (incoming.getProvider() != null) existed.setProvider(resolveProvider(incoming.getProvider()));
            if (incoming.getContract() != null) existed.setContract(resolveContract(incoming.getContract()));
            if (incoming.getSupport() != null) existed.setSupport(resolveSupport(incoming.getSupport()));
            return true;
        } catch (IllegalArgumentException iae) {
            err.put("error", "VALIDATION");
            err.put("message", iae.getMessage());
            return false;
        }
    }

    private NetworkConnectionArea resolveArea(NetworkConnectionArea area) {
        if (area == null) return null;
        if (area.getId() == null) return null;
        return areaRepository.findById(area.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy areaId=" + area.getId()));
    }

    private NetworkConnectionLine resolveLine(NetworkConnectionLine line) {
        if (line == null) return null;
        if (line.getId() == null) return null;
        return lineRepository.findById(line.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lineId=" + line.getId()));
    }

    private NetworkConnectionType resolveType(NetworkConnectionType type) {
        if (type == null) return null;
        if (type.getId() == null) return null;
        return typeRepository.findById(type.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy connectionTypeId=" + type.getId()));
    }

    private NetworkConnectionProvider resolveProvider(NetworkConnectionProvider provider) {
        if (provider == null) return null;
        if (provider.getId() == null) return null;
        return providerRepository.findById(provider.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy providerId=" + provider.getId()));
    }

    private NetworkConnectionContract resolveContract(NetworkConnectionContract contract) {
        if (contract == null) return null;
        if (contract.getId() == null) return null;
        return contractRepository.findById(contract.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy contractId=" + contract.getId()));
    }

    private NetworkConnectionSupport resolveSupport(NetworkConnectionSupport support) {
        if (support == null) return null;
        if (support.getId() == null) return null;
        return supportRepository.findById(support.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy supportId=" + support.getId()));
    }
}
