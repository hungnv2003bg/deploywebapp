package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.NetworkConnectionPermission;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.NetworkConnectionPermissionRepository;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/network-connections/global")
@CrossOrigin
public class NetworkConnectionPermissionsController {

    private final NetworkConnectionPermissionRepository repo;
    private final UsersService usersService;

    public NetworkConnectionPermissionsController(NetworkConnectionPermissionRepository repo, UsersService usersService) {
        this.repo = repo;
        this.usersService = usersService;
    }

    @GetMapping("/permissions")
    public Map<String, Object> getGlobalPermissions() {
        List<NetworkConnectionPermission> list = repo.findAll();
        Map<String, Object> result = new HashMap<>();
        result.put("groups", list.stream().filter(p -> p.getGroupId() != null).map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("groupId", p.getGroupId());
            m.put("view", p.isView());
            m.put("edit", p.isEdit());
            m.put("del", p.isDel());
            m.put("create", p.isCreate());
            return m;
        }).collect(Collectors.toList()));
        result.put("users", list.stream().filter(p -> p.getUserId() != null).map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("userId", p.getUserId());
            m.put("view", p.isView());
            m.put("edit", p.isEdit());
            m.put("del", p.isDel());
            m.put("create", p.isCreate());
            return m;
        }).collect(Collectors.toList()));
        return result;
    }

    @PostMapping("/permissions")
    public ResponseEntity<?> saveGlobalPermissions(@RequestBody Map<String, Object> payload) {
        List<NetworkConnectionPermission> existing = repo.findAll();
        repo.deleteAll(existing);
        List<NetworkConnectionPermission> toSave = new ArrayList<>();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> groups = (List<Map<String, Object>>) payload.getOrDefault("groups", new ArrayList<>());
        for (Map<String, Object> item : groups) {
            Long groupId = safeLong(item.get("groupId"));
            boolean view = safeBool(item.get("view"));
            boolean edit = safeBool(item.get("edit"));
            boolean del = safeBool(item.get("del"));
            boolean create = safeBool(item.get("create"));
            if (groupId == null || !(view || edit || del || create)) continue;
            NetworkConnectionPermission p = new NetworkConnectionPermission();
            p.setGroupId(groupId);
            p.setView(view);
            p.setEdit(edit);
            p.setDel(del);
            p.setCreate(create);
            toSave.add(p);
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> users = (List<Map<String, Object>>) payload.getOrDefault("users", new ArrayList<>());
        for (Map<String, Object> item : users) {
            Long userId = safeLong(item.get("userId"));
            boolean view = safeBool(item.get("view"));
            boolean edit = safeBool(item.get("edit"));
            boolean del = safeBool(item.get("del"));
            boolean create = safeBool(item.get("create"));
            if (userId == null || !(view || edit || del || create)) continue;
            NetworkConnectionPermission p = new NetworkConnectionPermission();
            p.setUserId(userId);
            p.setView(view);
            p.setEdit(edit);
            p.setDel(del);
            p.setCreate(create);
            toSave.add(p);
        }

        if (!toSave.isEmpty()) repo.saveAll(toSave);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/permissions/check")
    public Map<String, Boolean> checkMyPermissions() {
        Users me = usersService.getCurrentAuthenticatedUser();
        boolean canView = false, canEdit = false, canDelete = false, canCreate = false;
        if (me != null) {
            List<Long> groupIds = (me.getGroups() == null) ? Collections.emptyList() : me.getGroups().stream().map(g -> g.getId()).collect(Collectors.toList());
            List<NetworkConnectionPermission> userPerms = repo.findByUserId(me.getUserID().longValue());
            List<NetworkConnectionPermission> groupPerms = groupIds.isEmpty() ? Collections.emptyList() : repo.findByGroupIdIn(groupIds);
            for (NetworkConnectionPermission p : userPerms) {
                canView |= p.isView();
                canEdit |= p.isEdit();
                canDelete |= p.isDel();
                canCreate |= p.isCreate();
            }
            for (NetworkConnectionPermission p : groupPerms) {
                canView |= p.isView();
                canEdit |= p.isEdit();
                canDelete |= p.isDel();
                canCreate |= p.isCreate();
            }
        }
        Map<String, Boolean> m = new HashMap<>();
        m.put("view", canView);
        m.put("edit", canEdit);
        m.put("del", canDelete);
        m.put("create", canCreate);
        return m;
    }

    private Long safeLong(Object v) {
        try {
            if (v == null) return null;
            if (v instanceof Number) return ((Number) v).longValue();
            String s = String.valueOf(v).trim();
            if (s.isEmpty()) return null;
            return Long.parseLong(s);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean safeBool(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean) return (Boolean) v;
        String s = String.valueOf(v).trim();
        return "true".equalsIgnoreCase(s) || "1".equals(s);
    }
}

