package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.SyslogFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SyslogFileRepository extends JpaRepository<SyslogFile, Long> {
    List<SyslogFile> findBySyslogId(Long syslogId);
}

