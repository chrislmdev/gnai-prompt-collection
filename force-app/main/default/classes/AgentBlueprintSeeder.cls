public with sharing class AgentBlueprintSeeder {
    public class SeedSubAgent {
        public String name;
        public String description;
        public String instructions;
        public String model;
    }

    public class SeedBlueprint {
        public String id;
        public String category;
        public List<String> tags;
        public String summary;
        public String agentName;
        public String description;
        public String instructions;
        public String model;
        public String knowledge;
        public String personalization;
        public List<SeedSubAgent> subAgents;
    }

    /**
     * Inserts blueprints from the AgentBlueprintsSeed static resource.
     * @param replaceExisting When false, does nothing if any blueprint rows exist. When true, deletes all sub-agents and blueprints first.
     */
    @AuraEnabled
    public static Integer seedFromStaticResource(Boolean replaceExisting) {
        if (replaceExisting != true) {
            if ([SELECT COUNT() FROM Agent_Blueprint__c] > 0) {
                return 0;
            }
        } else {
            delete [SELECT Id FROM Agent_Sub_Agent__c];
            delete [SELECT Id FROM Agent_Blueprint__c];
        }

        StaticResource sr = [
            SELECT Body
            FROM StaticResource
            WHERE Name = 'AgentBlueprintsSeed'
            LIMIT 1
        ];
        List<SeedBlueprint> seeds = (List<SeedBlueprint>) System.JSON.deserialize(
            sr.Body.toString(),
            List<SeedBlueprint>.class
        );

        List<Agent_Blueprint__c> parents = new List<Agent_Blueprint__c>();
        for (SeedBlueprint s : seeds) {
            Agent_Blueprint__c b = new Agent_Blueprint__c();
            b.External_Id__c = truncate(s.id, 80);
            b.Name = truncate(s.agentName, 80);
            b.Category__c = truncate(s.category, 255);
            b.Tags_JSON__c = s.tags == null ? '[]' : JSON.serialize(s.tags);
            b.Summary__c = s.summary;
            b.Description__c = s.description;
            b.Instructions__c = s.instructions;
            b.Model__c = s.model;
            b.Knowledge__c = s.knowledge;
            b.Personalization__c = s.personalization;
            b.Status__c = 'Published';
            parents.add(b);
        }
        upsert parents External_Id__c;

        Set<String> extKeys = new Set<String>();
        for (SeedBlueprint s : seeds) {
            extKeys.add(s.id);
        }
        Map<String, Id> extToId = new Map<String, Id>();
        for (Agent_Blueprint__c row : [
            SELECT Id, External_Id__c
            FROM Agent_Blueprint__c
            WHERE External_Id__c IN :extKeys
        ]) {
            extToId.put(row.External_Id__c, row.Id);
        }

        if (!extToId.isEmpty()) {
            delete [
                SELECT Id
                FROM Agent_Sub_Agent__c
                WHERE Agent_Blueprint__c IN :extToId.values()
            ];
        }

        List<Agent_Sub_Agent__c> children = new List<Agent_Sub_Agent__c>();
        for (SeedBlueprint s : seeds) {
            Id parentId = extToId.get(s.id);
            if (parentId == null || s.subAgents == null) {
                continue;
            }
            for (SeedSubAgent sub : s.subAgents) {
                if (sub == null || String.isBlank(sub.name)) {
                    continue;
                }
                Agent_Sub_Agent__c c = new Agent_Sub_Agent__c();
                c.Agent_Blueprint__c = parentId;
                c.Name = truncate(sub.name, 80);
                c.Description__c = sub.description;
                c.Instructions__c = sub.instructions;
                c.Model__c = sub.model;
                children.add(c);
            }
        }
        if (!children.isEmpty()) {
            insert children;
        }
        return seeds.size();
    }

    private static String truncate(String s, Integer maxLen) {
        if (s == null) {
            return null;
        }
        return s.length() > maxLen ? s.substring(0, maxLen) : s;
    }
}
