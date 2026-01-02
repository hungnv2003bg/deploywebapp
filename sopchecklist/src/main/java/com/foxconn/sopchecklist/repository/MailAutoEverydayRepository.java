package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.MailAutoEveryday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MailAutoEverydayRepository extends JpaRepository<MailAutoEveryday, Long> {
    
    List<MailAutoEveryday> findByStatusTrue();
    
    List<MailAutoEveryday> findByTypeAndStatusTrue(String type);
    
    List<MailAutoEveryday> findByType(String type);
    
    boolean existsByTypeAndTimeSend(String type, String timeSend);
}

