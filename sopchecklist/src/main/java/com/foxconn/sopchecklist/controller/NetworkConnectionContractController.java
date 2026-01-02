package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.NetworkConnectionContract;
import com.foxconn.sopchecklist.repository.NetworkConnectionContractRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/network-connection-contracts")
@CrossOrigin
public class NetworkConnectionContractController {

    private final NetworkConnectionContractRepository repository;

    public NetworkConnectionContractController(NetworkConnectionContractRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<NetworkConnectionContract> findAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<NetworkConnectionContract> findOne(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<NetworkConnectionContract> create(@RequestBody NetworkConnectionContract body) {
        body.setId(null);
        if (body.getCreatedAt() == null) body.setCreatedAt(LocalDateTime.now());
        NetworkConnectionContract created = repository.save(body);
        return ResponseEntity.created(URI.create("/api/network-connection-contracts/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NetworkConnectionContract> replace(@PathVariable Long id, @RequestBody NetworkConnectionContract incoming) {
        return repository.findById(id).map(existed -> {
            existed.setContractNumber(incoming.getContractNumber());
            existed.setAppendix(incoming.getAppendix());
            existed.setStartDate(incoming.getStartDate());
            existed.setEndDate(incoming.getEndDate());
            existed.setPersonInCharge(incoming.getPersonInCharge());
            existed.setNote(incoming.getNote());
            existed.setUpdatedAt(LocalDateTime.now());
            existed.setUpdatedBy(incoming.getUpdatedBy());
            NetworkConnectionContract saved = repository.save(existed);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<NetworkConnectionContract> patch(@PathVariable Long id, @RequestBody NetworkConnectionContract incoming) {
        return repository.findById(id).map(existed -> {
            if (incoming.getContractNumber() != null) existed.setContractNumber(incoming.getContractNumber());
            if (incoming.getAppendix() != null) existed.setAppendix(incoming.getAppendix());
            if (incoming.getStartDate() != null) existed.setStartDate(incoming.getStartDate());
            if (incoming.getEndDate() != null) existed.setEndDate(incoming.getEndDate());
            if (incoming.getPersonInCharge() != null) existed.setPersonInCharge(incoming.getPersonInCharge());
            if (incoming.getNote() != null) existed.setNote(incoming.getNote());
            if (incoming.getUpdatedBy() != null) existed.setUpdatedBy(incoming.getUpdatedBy());
            existed.setUpdatedAt(LocalDateTime.now());
            NetworkConnectionContract saved = repository.save(existed);
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

