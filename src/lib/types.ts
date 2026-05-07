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
