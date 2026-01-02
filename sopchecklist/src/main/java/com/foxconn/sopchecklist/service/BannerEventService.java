package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.BannerEvent;
import com.foxconn.sopchecklist.repository.BannerEventRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class BannerEventService {

    private final BannerEventRepository repository;

    public BannerEventService(BannerEventRepository repository) {
        this.repository = repository;
    }

    public List<BannerEvent> findActiveToday() {
        LocalDate today = LocalDate.now();
        return repository.findActiveOn(today);
    }

    public List<BannerEvent> findAll() {
        return repository.findAll();
    }

    public BannerEvent save(BannerEvent event) {
        return repository.save(event);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    public BannerEvent update(Long id, BannerEvent changes) {
        BannerEvent current = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("BannerEvent not found"));
        if (changes.getNameEvent() != null) {
            current.setNameEvent(changes.getNameEvent());
        }
        if (changes.getStartDate() != null) {
            current.setStartDate(changes.getStartDate());
        }
        if (changes.getEndDate() != null) {
            current.setEndDate(changes.getEndDate());
        }
        if (changes.getStatus() != null) {
            current.setStatus(changes.getStatus());
        }
        if (changes.getMessageVi() != null) {
            current.setMessageVi(changes.getMessageVi());
        }
        if (changes.getMessageZh() != null) {
            current.setMessageZh(changes.getMessageZh());
        }
        return repository.save(current);
    }
}
