package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.entity.Role;
import com.foxconn.sopchecklist.entity.Group;
import com.foxconn.sopchecklist.entity.UserStatus;
import com.foxconn.sopchecklist.repository.UsersRepository;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UsersServiceImpl implements UsersService {

    @Autowired
    private UsersRepository usersRepository;

    @Override
    public Users findById(Integer id) {
        return usersRepository.findById(id).orElse(null);
    }

    @Override
    public Users save(Users user) {
        return usersRepository.save(user);
    }

    @Override
    public Users update(Users user) {
        return usersRepository.save(user);
    }

    @Override
    public void delete(Integer id) {
        usersRepository.deleteById(id);
    }

    @Override
    public List<Users> findAll() {
        return usersRepository.findAllOrderedByStatusAndCreatedAt();
    }

    @Override
    public List<Users> findByGroupId(Long groupId) {
        if (groupId == null) {
            return usersRepository.findAllOrderedByStatusAndCreatedAt();
        }
        return usersRepository.findDistinctByGroups_IdOrderedByStatusAndCreatedAt(groupId);
    }

    @Override
    public List<Users> findByFilters(String search, UserStatus status, String roleName, Long groupId) {
        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim().toLowerCase() : null;
        String normalizedRole = (roleName != null && !roleName.isBlank()) ? roleName.trim().toUpperCase() : null;

        List<Users> baseList = (groupId != null)
                ? usersRepository.findDistinctByGroups_IdOrderedByStatusAndCreatedAt(groupId)
                : usersRepository.findAllOrderedByStatusAndCreatedAt();

        return baseList.stream()
                .filter(user -> status == null || user.getStatus() == status)
                .filter(user -> {
                    if (normalizedRole == null) return true;
                    if (user.getRoles() == null) return false;
                    return user.getRoles().stream()
                            .anyMatch(role -> role != null && role.getName() != null &&
                                    role.getName().trim().equalsIgnoreCase(normalizedRole));
                })
                .filter(user -> {
                    if (normalizedSearch == null) return true;
                    String fullName = user.getFullName() != null ? user.getFullName().toLowerCase() : "";
                    String email = user.getEmail() != null ? user.getEmail().toLowerCase() : "";
                    String manv = user.getManv() != null ? user.getManv().toLowerCase() : "";
                    return fullName.contains(normalizedSearch) ||
                           email.contains(normalizedSearch) ||
                           manv.contains(normalizedSearch);
                })
                .collect(Collectors.toList());
    }

    @Override
    public Users findByManv(String manv) {
        return usersRepository.findByManv(manv).orElse(null);
    }

    @Override
    public Users findByEmail(String email) {
        return usersRepository.findByEmail(email).orElse(null);
    }

    @Override
    public Users findByPhone(String phone) {
        return usersRepository.findByPhone(phone).orElse(null);
    }

    @Override
    public Users assignRoles(Integer userId, Set<Role> roles) {
        Users user = findById(userId);
        if (user != null) {
            user.setRoles(roles);
            return save(user);
        }
        return null;
    }

    @Override
    public Users removeRole(Integer userId, Long roleId) {
        Users user = findById(userId);
        if (user != null && user.getRoles() != null) {
            user.getRoles().removeIf(role -> role.getId().equals(roleId));
            return save(user);
        }
        return null;
    }

    @Override
    public Users assignGroups(Integer userId, Set<Group> groups) {
        Users user = findById(userId);
        if (user != null) {
            user.setGroups(groups);
            return save(user);
        }
        return null;
    }

    @Override
    public boolean existsByManv(String manv) {
        return usersRepository.findByManv(manv).isPresent();
    }

    @Override
    public boolean existsByEmail(String email) {
        return usersRepository.findByEmail(email).isPresent();
    }

    @Override
    public boolean existsByPhone(String phone) {
        return usersRepository.findByPhone(phone).isPresent();
    }

    @Override
    public boolean existsByManvAndIdNot(String manv, Integer id) {
        return usersRepository.findByManvAndUserIDNot(manv, id).isPresent();
    }

    @Override
    public boolean existsByEmailAndIdNot(String email, Integer id) {
        return usersRepository.findByEmailAndUserIDNot(email, id).isPresent();
    }

    @Override
    public boolean existsByPhoneAndIdNot(String phone, Integer id) {
        return usersRepository.findByPhoneAndUserIDNot(phone, id).isPresent();
    }

    @Override
    public Users getCurrentAuthenticatedUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getName() == null) return null;

            return usersRepository.findByManv(authentication.getName()).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }
}

