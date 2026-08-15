import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/app/store';
import '../src/i18n';

/**
 * The topbar search must be a real, writable field.
 *
 * It shipped as a `<div>` with a border, a magnifier and placeholder text — indis-
 * tinguishable from an input until you clicked it, at which point nothing happened. That
 * is worse than an empty topbar: it reads as a broken app rather than an unfinished one,
 * and nothing in the type checker, the linter or a screenshot diff would ever notice,
 * because a div styled like an input renders exactly like an input.
 *
 * The first assertion here is therefore the blunt one: it is an `<input>`, and typing into
 * it changes its value. Everything after that covers the behaviour built on top.
 *
 * The two list queries are mocked. RTK Query builds its request from the relative `/api`
 * base URL, which throws under Node's undici before any fetch is attempted — the same
 * harness limitation documented in protectedRoute.test.tsx. The wiring against the real
 * API is verified in a browser instead.
 */

const useGetPropertiesQuery = vi.hoisted(() => vi.fn());
const useGetBuyersQuery = vi.hoisted(() => vi.fn());

vi.mock('../src/features/properties/propertyApi', () => ({ useGetPropertiesQuery }));
vi.mock('../src/features/buyers/buyerApi', () => ({ useGetBuyersQuery }));

/** Real routing, not a mocked `useNavigate` — this asserts where the app actually went,
 *  which is the thing that matters and is one fewer fiction to maintain. */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

const locationNow = () => screen.getByTestId('location').textContent;

const { GlobalSearch } = await import('../src/components/layout/GlobalSearch');

const property = {
  id: 'p1',
  title: 'Uttara Sector 13 flat',
  askingPrice: '16800000.00',
  areaName: 'Sector 13',
  district: 'Dhaka',
  status: 'NEW',
};
const buyer = {
  id: 'b1',
  name: 'Sultana Razia',
  phones: [{ id: 'bp1', display: '01599-001122' }],
};

function mockResults(
  {
    properties = [],
    buyers = [],
  }: { properties?: (typeof property)[]; buyers?: (typeof buyer)[] } = {},
) {
  useGetPropertiesQuery.mockReturnValue({ data: { items: properties }, isFetching: false });
  useGetBuyersQuery.mockReturnValue({ data: { items: buyers }, isFetching: false });
}

function renderSearch() {
  return render(
    <Provider store={createStore()}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <GlobalSearch />
        <LocationProbe />
      </MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockResults();
});

describe('GlobalSearch', () => {
  it('is an input the user can actually type into', async () => {
    renderSearch();
    const input = screen.getByRole('combobox');

    // The regression: this was a <div>. `getByRole('combobox')` would still find a div
    // carrying the role, so the tag itself is asserted.
    expect(input.tagName).toBe('INPUT');

    await userEvent.type(input, 'uttara');
    expect(input).toHaveValue('uttara');
  });

  it('asks the API for nothing until the query is long enough', async () => {
    renderSearch();
    await userEvent.type(screen.getByRole('combobox'), 'u');

    // One Bangla character matches most of the database; a request per keystroke from
    // the first one is wasted work and useless results.
    expect(useGetPropertiesQuery).toHaveBeenCalledWith(
      expect.objectContaining({ q: '' }),
      { skip: true },
    );
  });

  it('lists properties and buyers under separate headings', async () => {
    mockResults({ properties: [property], buyers: [buyer] });
    renderSearch();
    await userEvent.type(screen.getByRole('combobox'), 'sultana');

    expect(await screen.findByText('Uttara Sector 13 flat')).toBeInTheDocument();
    expect(screen.getByText('Sultana Razia')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('opens the highlighted result on Enter', async () => {
    mockResults({ properties: [property], buyers: [buyer] });
    renderSearch();
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'sultana');
    await screen.findByText('Uttara Sector 13 flat');

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    // Second press lands on the buyer, so the buyer route is the one that must open —
    // a flat option index across two groups is the whole reason to check the second.
    expect(locationNow()).toBe('/buyers/b1');
  });

  it('falls through to the full property list when nothing is highlighted', async () => {
    mockResults({ properties: [property] });
    renderSearch();
    await userEvent.type(screen.getByRole('combobox'), 'uttara');
    await screen.findByText('Uttara Sector 13 flat');

    await userEvent.keyboard('{Enter}');

    // The five-row preview has no filters and no pagination; Enter has to reach the page
    // that does, carrying the term.
    expect(locationNow()).toBe('/properties?q=uttara');
  });

  it('keeps the typed text when Escape closes the panel', async () => {
    mockResults({ properties: [property] });
    renderSearch();
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'uttara');
    await screen.findByText('Uttara Sector 13 flat');

    await userEvent.keyboard('{Escape}');

    // One press closes, a second clears. Losing the query on the first press is the
    // reflex people have when a panel is in the way.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('uttara');

    await userEvent.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });
});
