import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { RotaPanel } from '../RotaPanel';
import { DEFAULT_ROTA_CONFIG } from '../../contentModel';
import type { RotaConfig } from '../../types';

const config = (patch: Partial<RotaConfig> = {}): RotaConfig => ({
  ...DEFAULT_ROTA_CONFIG,
  startDate: '2026-08-03',
  ...patch,
});

describe('RotaPanel', () => {
  const setup = (names: string[] = ['Alice', 'Bob'], cfg: RotaConfig = config()) => {
    const onChange = jest.fn();
    const utils = render(<RotaPanel names={names} config={cfg} onChange={onChange} />);
    return { onChange, ...utils };
  };

  it('shows the empty state when there are no names', () => {
    const { getByText } = setup([]);
    expect(getByText(/Add names to the wheel/i)).toBeInTheDocument();
  });

  it('renders one live slot per period from the enabled names', () => {
    const { getAllByTestId, getByText } = setup(['Alice', 'Bob'], config({ periods: 8 }));
    expect(getByText('8 changes')).toBeInTheDocument();
    const slots = getAllByTestId('spinthewheel-rota-slot');
    expect(slots).toHaveLength(8);
    expect(slots[0]).toHaveTextContent('Alice');
  });

  it('switches order and frequency through the segmented controls', () => {
    const { getByTestId, onChange } = setup();
    fireEvent.click(getByTestId('spinthewheel-rota-order-shuffle'));
    expect(onChange).toHaveBeenCalledWith({ order: 'shuffle' });
    fireEvent.click(getByTestId('spinthewheel-rota-frequency-daily'));
    expect(onChange).toHaveBeenCalledWith({ frequency: 'daily' });
    fireEvent.click(getByTestId('spinthewheel-rota-periods-12'));
    expect(onChange).toHaveBeenCalledWith({ periods: 12 });
  });

  it('toggles skip weekends', () => {
    const { getByLabelText, onChange } = setup();
    fireEvent.click(getByLabelText('Skip weekends'));
    expect(onChange).toHaveBeenCalledWith({ skipWeekends: true });
  });

  it('updates the start date', () => {
    const { getByLabelText, onChange } = setup();
    fireEvent.change(getByLabelText('Starts on'), { target: { value: '2026-09-01' } });
    expect(onChange).toHaveBeenCalledWith({ startDate: '2026-09-01' });
  });

  it('copies the rota as a tab-separated table to the clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByLabelText } = setup(['Alice', 'Bob'], config({ periods: 4 }));
    fireEvent.click(getByLabelText('Copy rota to clipboard'));
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(
      'Date\tName\n2026-08-03\tAlice\n2026-08-10\tBob\n2026-08-17\tAlice\n2026-08-24\tBob',
    );
  });

  it('copies every generated slot, not just the first name', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const { getAllByTestId, getByLabelText } = setup(['Alice', 'Bob'], config({ periods: 8 }));
    fireEvent.click(getByLabelText('Copy rota to clipboard'));
    await Promise.resolve();
    const rows = writeText.mock.calls[0][0].split('\n');
    expect(rows[0]).toBe('Date\tName');
    expect(rows).toHaveLength(getAllByTestId('spinthewheel-rota-slot').length + 1);
  });

  it('shows transient copied feedback', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByLabelText, findByRole, queryByRole } = setup(['Alice']);
    fireEvent.click(getByLabelText('Copy rota to clipboard'));
    expect(await findByRole('status').then((el) => el.textContent)).toMatch(/Copied/i);
    await new Promise((resolve) => setTimeout(resolve, 1600));
    expect(queryByRole('status')).not.toBeInTheDocument();
  });

  it('reshuffles with a new seed when shuffle order is active', () => {
    const onChange = jest.fn();
    const { queryByLabelText } = setup(['Alice'], config());
    expect(queryByLabelText('Reshuffle rota')).not.toBeInTheDocument();
    const shuffleSetup = render(
      <RotaPanel names={['Alice']} config={config({ order: 'shuffle' })} onChange={onChange} />,
    );
    fireEvent.click(shuffleSetup.getByLabelText('Reshuffle rota'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ seed: expect.any(Number) }));
  });
});
