package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.BannerEvent;
import com.foxconn.sopchecklist.service.BannerEventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/banner-events")
@CrossOrigin
public class BannerEventController {

    private final BannerEventService service;

    public BannerEventController(BannerEventService service) {
        this.service = service;
    }

    @GetMapping
    public List<BannerEvent> getAll() {
        return service.findAll();
    }

    @GetMapping("/active")
    public List<BannerEvent> getActiveToday() {
        return service.findActiveToday();
    }

    @PostMapping
    public ResponseEntity<BannerEvent> create(@RequestBody BannerEvent event) {
        BannerEvent saved = service.save(event);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<BannerEvent> update(@PathVariable Long id, @RequestBody BannerEvent event) {
        BannerEvent saved = service.update(id, event);
        return ResponseEntity.ok(saved);
    }
}
