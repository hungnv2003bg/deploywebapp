package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.entity.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface UsersRepository extends JpaRepository<Users, Integer> {
    Optional<Users> findByManv(String manv);
    Optional<Users> findByEmail(String email);
    Optional<Users> findByPhone(String phone);
    

    Optional<Users> findByManvAndUserIDNot(String manv, Integer userID);

    Optional<Users> findByEmailAndUserIDNot(String email, Integer userID);

    Optional<Users> findByPhoneAndUserIDNot(String phone, Integer userID);

    List<Users> findDistinctByGroups_Id(Long groupId);
    
    /**
     * Tìm tất cả users và sắp xếp: ACTIVE trước, sau đó theo createdAt (tạo trước ở trên)
     */
    @Query("SELECT u FROM Users u ORDER BY " +
           "CASE WHEN u.status = com.foxconn.sopchecklist.entity.UserStatus.ACTIVE THEN 0 ELSE 1 END, " +
           "u.createdAt ASC")
    List<Users> findAllOrderedByStatusAndCreatedAt();
    
    /**
     * Tìm users theo groupId và sắp xếp: ACTIVE trước, sau đó theo createdAt (tạo trước ở trên)
     */
    @Query("SELECT DISTINCT u FROM Users u JOIN u.groups g WHERE g.id = :groupId ORDER BY " +
           "CASE WHEN u.status = com.foxconn.sopchecklist.entity.UserStatus.ACTIVE THEN 0 ELSE 1 END, " +
           "u.createdAt ASC")
    List<Users> findDistinctByGroups_IdOrderedByStatusAndCreatedAt(@Param("groupId") Long groupId);

    @Query("SELECT DISTINCT u FROM Users u " +
           "LEFT JOIN u.groups g " +
           "LEFT JOIN u.roles r " +
           "WHERE (:groupId IS NULL OR g.id = :groupId) " +
           "AND (:status IS NULL OR u.status = :status) " +
           "AND (:roleName IS NULL OR UPPER(r.name) = UPPER(:roleName)) " +
           "AND (:search IS NULL OR (" +
             "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
             "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
             "LOWER(u.manv) LIKE LOWER(CONCAT('%', :search, '%'))" +
           ")) " +
           "ORDER BY " +
           "CASE WHEN u.status = com.foxconn.sopchecklist.entity.UserStatus.ACTIVE THEN 0 ELSE 1 END, " +
           "u.createdAt ASC")
    List<Users> findUsersByFilters(
            @Param("search") String search,
            @Param("status") UserStatus status,
            @Param("roleName") String roleName,
            @Param("groupId") Long groupId
    );
}

