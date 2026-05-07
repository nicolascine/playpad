export type PlaygroundFile = {
  name: string;
  content: string;
};

export type Playground = {
  v: 1;
  title: string;
  files: PlaygroundFile[];
  note?: string;
  createdAt: number;
};

export type Encrypted = {
  v: 1;
  salt: string;
  iv: string;
  ct: string;
};
