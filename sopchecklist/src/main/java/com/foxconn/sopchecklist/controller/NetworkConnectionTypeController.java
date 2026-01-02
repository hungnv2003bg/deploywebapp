package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.NetworkConnectionType;
import com.foxconn.sopchecklist.repository.NetworkConnectionTypeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/network-connection-types")
@CrossOrigin
public class NetworkConnectionTypeController {

    private final NetworkConnectionTypeRepository repository;

    public NetworkConnectionTypeController(NetworkConnectionTypeRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<NetworkConnectionType> findAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<NetworkConnectionType> findOne(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
}

