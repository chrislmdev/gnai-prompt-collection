@IsTest
private class AgentBlueprintPageControllerTest {
    @IsTest
    static void getAgentsJsonBase64_containsBlueprintId() {
        Agent_Blueprint__c b = new Agent_Blueprint__c(
            Name = 'Page Test Agent',
            External_Id__c = 'page-test-agent',
            Category__c = 'Test',
            Tags_JSON__c = '["alpha"]',
            Summary__c = 'Summary line',
            Description__c = 'D',
            Instructions__c = 'I',
            Model__c = 'M',
            Knowledge__c = 'K',
            Personalization__c = 'P',
            Status__c = 'Published'
        );
        insert b;

        AgentBlueprintPageController ctl = new AgentBlueprintPageController();
        System.assertNotEquals(null, ctl.getAgentsJsonBase64());
        String json = EncodingUtil.base64Decode(ctl.getAgentsJsonBase64()).toString();
        System.assert(json.contains('page-test-agent'), json);
        System.assert(json.contains('Page Test Agent'), json);
    }

    @IsTest
    static void seedFromStaticResource_returnsMap() {
        Map<String, Object> res = AgentBlueprintPageController.seedFromStaticResource(false);
        System.assertNotEquals(null, res);
        System.assertEquals(true, res.get('success'));
    }
}
