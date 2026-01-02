package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.NetworkConnectionProvider;
import com.foxconn.sopchecklist.repository.NetworkConnectionProviderRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/network-connection-providers")
@CrossOrigin
public class NetworkConnectionProviderController {

    private final NetworkConnectionProviderRepository repository;

    public NetworkConnectionProviderController(NetworkConnectionProviderRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<NetworkConnectionProvider> findAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<NetworkConnectionProvider> findOne(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
}

