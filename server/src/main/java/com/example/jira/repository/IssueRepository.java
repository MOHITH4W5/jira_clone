package com.example.jira.repository;

import com.example.jira.model.Issue;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface IssueRepository extends MongoRepository<Issue, ObjectId> {

    List<Issue> findByProjectId(String projectId);
}
