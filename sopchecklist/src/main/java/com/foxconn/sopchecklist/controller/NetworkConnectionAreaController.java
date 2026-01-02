package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.NetworkConnectionArea;
import com.foxconn.sopchecklist.repository.NetworkConnectionAreaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/network-connection-areas")
@CrossOrigin
public class NetworkConnectionAreaController {

    private final NetworkConnectionAreaRepository repository;

    public NetworkConnectionAreaController(NetworkConnectionAreaRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<NetworkConnectionArea> findAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<NetworkConnectionArea> findOne(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
}

