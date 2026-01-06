let latestTimestamp: number | null = null;

export const FrameBuffer = {
  write(ts: number) {
    latestTimestamp = ts;
  },

  read(): number | null {
    const ts = latestTimestamp;
    latestTimestamp = null;
    return ts;
  },
};