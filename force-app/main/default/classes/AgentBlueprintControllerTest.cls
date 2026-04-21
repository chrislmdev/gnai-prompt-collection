@IsTest
private class AgentBlueprintControllerTest {
    @IsTest
    static void getBlueprints_returnsPublished() {
        Agent_Blueprint__c b = new Agent_Blueprint__c(
            Name = 'Test Agent',
            External_Id__c = 'test-agent-1',
            Category__c = 'Test',
            Tags_JSON__c = '["a","b"]',
            Summary__c = 'Summary',
            Status__c = 'Published'
        );
        insert b;
        insert new Agent_Sub_Agent__c(
            Agent_Blueprint__c = b.Id,
            Name = 'Sub one',
            Description__c = 'd',
            Instructions__c = 'i',
            Model__c = 'm'
        );

        List<AgentBlueprintController.BlueprintVm> rows = AgentBlueprintController.getBlueprints(false);
        System.assertEquals(1, rows.size(), 'Expected one published row');
        System.assertEquals(1, rows[0].subAgents.size());
    }

    @IsTest
    static void createBlueprint_insertsParentAndChildren() {
        String jsonPayload =
            '{"id":"new-from-test","category":"Cat","tags":["t1"],"summary":"Sum","agentName":"Agent X","description":"d","instructions":"i","model":"m","knowledge":"k","personalization":"p","status":"Draft","subAgents":[{"name":"Sub A","description":"d","instructions":"i","model":"m"}]}';

        Test.startTest();
        Id bid = AgentBlueprintController.createBlueprint(jsonPayload);
        Test.stopTest();

        Agent_Blueprint__c got = [
            SELECT Id, (SELECT Id FROM Sub_Agents__r)
            FROM Agent_Blueprint__c
            WHERE Id = :bid
        ];
        System.assertEquals(1, got.Sub_Agents__r.size());
    }
}
