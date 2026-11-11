/** Something that happened in the domain, raised by an aggregate and published after commit. */
export interface DomainEvent {
  readonly occurredAt: Date;
}

/** Base for aggregates that collect domain events until the application layer pulls them. */
export abstract class AggregateRoot<E extends DomainEvent = DomainEvent> {
  private pending: E[] = [];

  protected raise(event: E): void {
    this.pending.push(event);
  }

  pullEvents(): E[] {
    const events = this.pending;
    this.pending = [];
    return events;
  }
}
