public with sharing class AgentBlueprintController {
    public class SubAgentVm {
        @AuraEnabled public String name;
        @AuraEnabled public String description;
        @AuraEnabled public String instructions;
        @AuraEnabled public String model;
    }

    public class BlueprintVm {
        @AuraEnabled public Id recordId;
        @AuraEnabled public String externalId;
        @AuraEnabled public String category;
        @AuraEnabled public List<String> tags;
        @AuraEnabled public String summary;
        @AuraEnabled public String agentName;
        @AuraEnabled public String description;
        @AuraEnabled public String instructions;
        @AuraEnabled public String model;
        @AuraEnabled public String knowledge;
        @AuraEnabled public String personalization;
        @AuraEnabled public String status;
        @AuraEnabled public List<SubAgentVm> subAgents;
    }

    public class CreatePayload {
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
        public String status;
        public List<SubAgentVm> subAgents;
    }

    @AuraEnabled
    public static List<BlueprintVm> getBlueprints(Boolean includeDrafts) {
        List<Agent_Blueprint__c> rows;
        if (includeDrafts == true) {
            rows = [
                SELECT
                    Id,
                    Name,
                    External_Id__c,
                    Category__c,
                    Tags_JSON__c,
                    Summary__c,
                    Description__c,
                    Instructions__c,
                    Model__c,
                    Knowledge__c,
                    Personalization__c,
                    Status__c,
                    (
                        SELECT Name, Description__c, Instructions__c, Model__c
                        FROM Sub_Agents__r
                        ORDER BY Name
                    )
                FROM Agent_Blueprint__c
                ORDER BY Category__c NULLS LAST, Name
            ];
        } else {
            rows = [
                SELECT
                    Id,
                    Name,
                    External_Id__c,
                    Category__c,
                    Tags_JSON__c,
                    Summary__c,
                    Description__c,
                    Instructions__c,
                    Model__c,
                    Knowledge__c,
                    Personalization__c,
                    Status__c,
                    (
                        SELECT Name, Description__c, Instructions__c, Model__c
                        FROM Sub_Agents__r
                        ORDER BY Name
                    )
                FROM Agent_Blueprint__c
                WHERE Status__c = 'Published' OR Status__c = NULL
                ORDER BY Category__c NULLS LAST, Name
            ];
        }
        List<BlueprintVm> out = new List<BlueprintVm>();
        for (Agent_Blueprint__c r : rows) {
            BlueprintVm vm = new BlueprintVm();
            vm.recordId = r.Id;
            vm.externalId = r.External_Id__c;
            vm.category = r.Category__c;
            vm.tags = parseTags(r.Tags_JSON__c);
            vm.summary = r.Summary__c;
            vm.agentName = r.Name;
            vm.description = r.Description__c;
            vm.instructions = r.Instructions__c;
            vm.model = r.Model__c;
            vm.knowledge = r.Knowledge__c;
            vm.personalization = r.Personalization__c;
            vm.status = r.Status__c;
            vm.subAgents = new List<SubAgentVm>();
            for (Agent_Sub_Agent__c s : r.Sub_Agents__r) {
                SubAgentVm sv = new SubAgentVm();
                sv.name = s.Name;
                sv.description = s.Description__c;
                sv.instructions = s.Instructions__c;
                sv.model = s.Model__c;
                vm.subAgents.add(sv);
            }
            out.add(vm);
        }
        return out;
    }

    private static List<String> parseTags(String tagsJson) {
        if (String.isBlank(tagsJson)) {
            return new List<String>();
        }
        try {
            return (List<String>) System.JSON.deserialize(tagsJson, List<String>.class);
        } catch (Exception e) {
            return new List<String>();
        }
    }

    @AuraEnabled
    public static Id createBlueprint(String jsonPayload) {
        if (String.isBlank(jsonPayload)) {
            throw new AuraHandledException('Payload required.');
        }
        CreatePayload p = (CreatePayload) System.JSON.deserialize(jsonPayload, CreatePayload.class);
        if (String.isBlank(p.id)) {
            throw new AuraHandledException('Blueprint id (slug) is required.');
        }
        if (String.isBlank(p.agentName)) {
            throw new AuraHandledException('Agent name is required.');
        }
        Integer dup = [SELECT COUNT() FROM Agent_Blueprint__c WHERE External_Id__c = :p.id];
        if (dup > 0) {
            throw new AuraHandledException('A blueprint with this external id already exists.');
        }
        Agent_Blueprint__c b = new Agent_Blueprint__c();
        b.External_Id__c = truncate(p.id, 80);
        b.Name = truncate(p.agentName, 80);
        b.Category__c = truncate(p.category, 255);
        b.Tags_JSON__c = p.tags == null ? '[]' : JSON.serialize(p.tags);
        b.Summary__c = p.summary;
        b.Description__c = p.description;
        b.Instructions__c = p.instructions;
        b.Model__c = p.model;
        b.Knowledge__c = p.knowledge;
        b.Personalization__c = p.personalization;
        b.Status__c = String.isBlank(p.status) ? 'Draft' : p.status;
        insert b;

        if (p.subAgents != null && !p.subAgents.isEmpty()) {
            List<Agent_Sub_Agent__c> subs = new List<Agent_Sub_Agent__c>();
            for (SubAgentVm sv : p.subAgents) {
                if (sv == null || String.isBlank(sv.name)) {
                    continue;
                }
                Agent_Sub_Agent__c c = new Agent_Sub_Agent__c();
                c.Agent_Blueprint__c = b.Id;
                c.Name = truncate(sv.name, 80);
                c.Description__c = sv.description;
                c.Instructions__c = sv.instructions;
                c.Model__c = sv.model;
                subs.add(c);
            }
            if (!subs.isEmpty()) {
                insert subs;
            }
        }
        return b.Id;
    }

    private static String truncate(String s, Integer maxLen) {
        if (s == null) {
            return null;
        }
        return s.length() > maxLen ? s.substring(0, maxLen) : s;
    }
}
