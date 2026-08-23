// Domain Events — Clear contracts for state changes
// Emitted by the domain layer, consumed by infrastructure/queue

export enum OpportunityEvent {
    CREATED = 'opportunity.created',
    UPDATED = 'opportunity.updated',
    PUBLISHED = 'opportunity.published', // Publicly visible
    EXPIRED = 'opportunity.expired',
    ARCHIVED = 'opportunity.archived',
    REJECTED = 'opportunity.rejected',
}

export interface DomainEvent<T = unknown> {
    id: string;
    occurredAt: Date;
    type: string;
    data: T;
}

export interface OpportunityCreatedEvent extends DomainEvent {
    type: OpportunityEvent.CREATED;
    data: {
        opportunityId: string;
        source?: string;
    };
}

export interface OpportunityPublishedEvent extends DomainEvent {
    type: OpportunityEvent.PUBLISHED;
    data: {
        opportunityId: string;
        title: string;
        companyName: string;
    };
}
