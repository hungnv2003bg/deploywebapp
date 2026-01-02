package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.NetworkConnectionSupport;
import com.foxconn.sopchecklist.repository.NetworkConnectionSupportRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/network-connection-supports")
@CrossOrigin
public class NetworkConnectionSupportController {

    private final NetworkConnectionSupportRepository repository;

    public NetworkConnectionSupportController(NetworkConnectionSupportRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<NetworkConnectionSupport> findAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<NetworkConnectionSupport> findOne(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<NetworkConnectionSupport> create(@RequestBody NetworkConnectionSupport body) {
        body.setId(null);
        if (body.getCreatedAt() == null) body.setCreatedAt(LocalDateTime.now());
        NetworkConnectionSupport created = repository.save(body);
        return ResponseEntity.created(URI.create("/api/network-connection-supports/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NetworkConnectionSupport> replace(@PathVariable Long id, @RequestBody NetworkConnectionSupport incoming) {
        return repository.findById(id).map(existed -> {
            existed.setFullName(incoming.getFullName());
            existed.setPhoneNumber(incoming.getPhoneNumber());
            existed.setHotline(incoming.getHotline());
            existed.setNote(incoming.getNote());
            existed.setUpdatedAt(LocalDateTime.now());
            existed.setUpdatedBy(incoming.getUpdatedBy());
            NetworkConnectionSupport saved = repository.save(existed);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<NetworkConnectionSupport> patch(@PathVariable Long id, @RequestBody NetworkConnectionSupport incoming) {
        return repository.findById(id).map(existed -> {
            if (incoming.getFullName() != null) existed.setFullName(incoming.getFullName());
            if (incoming.getPhoneNumber() != null) existed.setPhoneNumber(incoming.getPhoneNumber());
            if (incoming.getHotline() != null) existed.setHotline(incoming.getHotline());
            if (incoming.getNote() != null) existed.setNote(incoming.getNote());
            if (incoming.getUpdatedBy() != null) existed.setUpdatedBy(incoming.getUpdatedBy());
            existed.setUpdatedAt(LocalDateTime.now());
            NetworkConnectionSupport saved = repository.save(existed);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

