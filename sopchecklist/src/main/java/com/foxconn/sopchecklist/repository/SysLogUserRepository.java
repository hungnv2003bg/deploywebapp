package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.SysLogUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SysLogUserRepository extends JpaRepository<SysLogUser, Long> {
    Optional<SysLogUser> findByFactoryId(Integer factoryId);
    Optional<SysLogUser> findByUserId(Integer userId);
}

