package com.example.jira.config;

import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
public class MongoConfig {

    private static final Logger logger = LoggerFactory.getLogger(MongoConfig.class);

    @Bean
    public MongoClient mongoClient() {
        return MongoClients.create(resolveMongoUri());
    }

    @Bean
    public MongoTemplate mongoTemplate(MongoClient mongoClient) {
        String database = new ConnectionString(resolveMongoUri()).getDatabase();
        if (database == null || database.isBlank()) {
            database = "jira";
        }
        return new MongoTemplate(mongoClient, database);
    }

    private String resolveMongoUri() {
        String springDataMongoUri = System.getenv("SPRING_DATA_MONGODB_URI");
        if (isNonBlank(springDataMongoUri)) {
            logResolvedUri("SPRING_DATA_MONGODB_URI", springDataMongoUri);
            return springDataMongoUri;
        }

        String springMongoUri = System.getenv("SPRING_MONGODB_URI");
        if (isNonBlank(springMongoUri)) {
            logResolvedUri("SPRING_MONGODB_URI", springMongoUri);
            return springMongoUri;
        }

        String springDataMongoUriProperty = System.getProperty("spring.data.mongodb.uri");
        if (isNonBlank(springDataMongoUriProperty)) {
            logResolvedUri("spring.data.mongodb.uri (system property)", springDataMongoUriProperty);
            return springDataMongoUriProperty;
        }

        String springMongoUriProperty = System.getProperty("spring.mongodb.uri");
        if (isNonBlank(springMongoUriProperty)) {
            logResolvedUri("spring.mongodb.uri (system property)", springMongoUriProperty);
            return springMongoUriProperty;
        }

        throw new IllegalStateException(
                "MongoDB URI is missing. Set SPRING_DATA_MONGODB_URI in the environment.");
    }

    private boolean isNonBlank(String value) {
        return value != null && !value.isBlank();
    }

    private void logResolvedUri(String source, String uri) {
        try {
            ConnectionString connectionString = new ConnectionString(uri);
            logger.info(
                    "MongoDB URI source='{}', hosts='{}', database='{}'",
                    source,
                    connectionString.getHosts(),
                    connectionString.getDatabase());
        } catch (Exception ex) {
            logger.warn("MongoDB URI source='{}' could not be parsed.", source);
        }
    }
}
