const {agentProvider, mockManager, fixtureManager, matchers} = require('../utils/e2e-framework');
const {anyGhostAgent, anyObjectId, anyISODateTime, anyUuid, anyContentVersion, anyNumber} = matchers;

const buildNewsletterSnapshot = (deleteMember = false) => {
    const newsLetterSnapshot = {
        id: anyObjectId,
        uuid: anyUuid,
        created_at: anyISODateTime,
        updated_at: anyISODateTime
    };

    if (deleteMember) {
        newsLetterSnapshot._pivot_member_id = anyObjectId;
        newsLetterSnapshot._pivot_newsletter_id = anyObjectId;
    }

    return newsLetterSnapshot;
};

const buildMemberSnapshot = (deleteMember = false) => {
    const memberSnapshot = {
        id: anyObjectId,
        uuid: anyUuid,
        created_at: anyISODateTime,
        updated_at: anyISODateTime,
        newsletters: new Array(1).fill(buildNewsletterSnapshot(deleteMember))
    };

    return memberSnapshot;
};

describe('member.* events', function () {
    let adminAPIAgent;
    let webhookMockReceiver;

    before(async function () {
        adminAPIAgent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('integrations');
        await adminAPIAgent.loginAsOwner();
    });

    beforeEach(function () {
        webhookMockReceiver = mockManager.mockWebhookRequests();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('member.added event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/member-added/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'member.added',
            url: webhookURL
        });

        await adminAPIAgent
            .post('members/')
            .body({
                members: [{
                    name: 'Test Member',
                    email: 'testemail@example.com',
                    note: 'test note'
                }]
            })
            .expectStatus(201);

        await webhookMockReceiver.receivedRequest();

        webhookMockReceiver
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyNumber,
                'user-agent': anyGhostAgent
            })
            .matchBodySnapshot({
                member: {
                    current: buildMemberSnapshot()
                }
            });
    });

    it('member.deleted event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/member-deleted/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'member.deleted',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('members/')
            .body({
                members: [{
                    name: 'Test Member2',
                    email: 'testemail2@example.com',
                    note: 'test note2'
                }]
            })
            .expectStatus(201);
        
        const id = res.body.members[0].id;

        await adminAPIAgent
            .delete('members/' + id)
            .expectStatus(204);

        await webhookMockReceiver.receivedRequest();

        webhookMockReceiver
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyNumber,
                'user-agent': anyGhostAgent
            })
            .matchBodySnapshot({
                member: {
                    current: {},
                    previous: buildMemberSnapshot(true)
                }
            });
    });
});