/**
 * Visualforce page controller for AgentBlueprints.page — supplies base64 JSON for the static UI
 * and JavaScript remoting for seed / create.
 */
public with sharing class AgentBlueprintPageController {
    public String getAgentsJsonBase64() {
        return EncodingUtil.base64Encode(Blob.valueOf(buildAgentsJson()));
    }

    private static String buildAgentsJson() {
        List<Object> rows = new List<Object>();
        for (AgentBlueprintController.BlueprintVm vm : AgentBlueprintController.getBlueprints(true)) {
            Map<String, Object> m = new Map<String, Object>();
            m.put('id', vm.externalId);
            m.put('category', vm.category);
            m.put('tags', vm.tags != null ? vm.tags : new List<String>());
            m.put('summary', vm.summary);
            m.put('agentName', vm.agentName);
            m.put('description', vm.description);
            m.put('instructions', vm.instructions);
            m.put('model', vm.model);
            m.put('knowledge', vm.knowledge);
            m.put('personalization', vm.personalization);
            List<Map<String, Object>> subs = new List<Map<String, Object>>();
            if (vm.subAgents != null) {
                for (AgentBlueprintController.SubAgentVm s : vm.subAgents) {
                    Map<String, Object> sm = new Map<String, Object>();
                    sm.put('name', s.name);
                    sm.put('description', s.description);
                    sm.put('instructions', s.instructions);
                    sm.put('model', s.model);
                    subs.add(sm);
                }
            }
            m.put('subAgents', subs);
            rows.add(m);
        }
        return JSON.serialize(rows);
    }

    @RemoteAction
    public static Map<String, Object> seedFromStaticResource(Boolean replaceExisting) {
        try {
            Boolean repl = replaceExisting == true;
            Integer n = AgentBlueprintSeeder.seedFromStaticResource(repl);
            return new Map<String, Object>{
                'success' => true,
                'count' => n
            };
        } catch (Exception e) {
            return new Map<String, Object>{
                'success' => false,
                'message' => e.getMessage()
            };
        }
    }

    @RemoteAction
    public static Map<String, Object> createBlueprintRemote(String jsonPayload) {
        try {
            Id bid = AgentBlueprintController.createBlueprint(jsonPayload);
            return new Map<String, Object>{
                'success' => true,
                'recordId' => bid
            };
        } catch (Exception e) {
            return new Map<String, Object>{
                'success' => false,
                'message' => e.getMessage()
            };
        }
    }
}
