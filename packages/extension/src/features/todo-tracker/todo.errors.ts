export class TodoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TodoError";
  }
}

export class TodoStorageError extends TodoError {
  constructor(message: string) {
    super(message);
    this.name = "TodoStorageError";
  }
}

export class TodoBackendError extends TodoError {
  constructor(message: string) {
    super(message);
    this.name = "TodoBackendError";
  }
}

export class TodoParseError extends TodoError {
  constructor(message: string) {
    super(message);
    this.name = "TodoParseError";
  }
}
