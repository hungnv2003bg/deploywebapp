package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.NetworkConnectionLine;
import com.foxconn.sopchecklist.repository.NetworkConnectionLineRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/network-connection-lines")
@CrossOrigin
public class NetworkConnectionLineController {

    private final NetworkConnectionLineRepository repository;

    public NetworkConnectionLineController(NetworkConnectionLineRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<NetworkConnectionLine> findAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<NetworkConnectionLine> findOne(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
}

