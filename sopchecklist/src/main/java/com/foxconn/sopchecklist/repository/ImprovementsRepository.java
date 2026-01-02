package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.Improvements;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ImprovementsRepository extends JpaRepository<Improvements, Integer> {
    Optional<Improvements> findFirstByChecklistDetailId(String checklistDetailId);
    Optional<Improvements> findFirstByChecklist_IdAndCategoryOrderByCreatedAtDesc(Long checklistId, String category);
    
    @Query(value = "\n" +
            "SELECT DISTINCT i.*\n" +
            "FROM Improvements i\n" +
            "LEFT JOIN improvement_responsible ir ON ir.improvement_id = i.improvementID\n" +
            "LEFT JOIN Users u ON ir.responsible = CONCAT('user:', u.userid)\n" +
            "WHERE (:search IS NULL OR :search = '' OR\n" +
            "       LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')) OR\n" +
            "       LOWER(u.manv) LIKE LOWER(CONCAT('%', :search, '%')))\n",
            nativeQuery = true)
    List<Improvements> findAllWithUserSearch(@Param("search") String search);
}

