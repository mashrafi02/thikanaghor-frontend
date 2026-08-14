import { baseApi, unwrapData } from '@/app/api/baseApi';
import type { PropertyStatus } from '@/app/api/types';
import { adjustMoney } from './money';
import type { PipelineResponse } from './types';

/**
 * The board's query, and the move that reorders it.
 *
 * `moveCard` is a separate endpoint from `changeStatus` in `propertyApi` even though it
 * hits the same URL. The difference is entirely in the optimistic update: the stepper
 * flips one field on one record, whereas a board move has to *relocate a card between
 * two arrays and correct both column totals* — and then put all of it back if the server
 * refuses. Sharing one mutation would mean one of the two callers passing a pile of
 * context it does not have.
 */
export const pipelineApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPipeline: builder.query<PipelineResponse, void>({
      query: () => ({ url: '/properties/pipeline' }),
      transformResponse: unwrapData<PipelineResponse>,
      // Also tagged Property/LIST: anything that edits, creates or deletes a property
      // changes what is on this board.
      providesTags: [
        { type: 'Property', id: 'PIPELINE' },
        { type: 'Property', id: 'LIST' },
      ],
    }),

    moveCard: builder.mutation<
      unknown,
      { id: string; from: PropertyStatus; to: PropertyStatus }
    >({
      query: ({ id, to }) => ({
        url: `/properties/${id}/status`,
        method: 'PATCH',
        body: { status: to },
      }),
      // The moved record's detail page and every dashboard figure are now stale. The
      // board itself is not — the optimistic patch below already has it right, and
      // invalidating it would cause a visible re-shuffle after a successful move.
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Property', id }, 'Dashboard'],

      async onQueryStarted({ id, from, to }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          pipelineApi.util.updateQueryData('getPipeline', undefined, (draft) => {
            const source = draft.items[from];
            const index = source?.findIndex((card) => card.id === id) ?? -1;
            if (!source || index === -1) return;

            const [card] = source.splice(index, 1);
            if (!card) return;

            card.status = to;
            card.daysInCurrentStatus = 0;
            // The move *is* activity, so the card stops being stale the moment it lands.
            card.isStale = false;

            // A card can legally move out of the five board columns — ON_HOLD and
            // CLOSED_LOST are both valid targets. When it does it simply leaves the
            // board, so there is no destination array to push it into.
            draft.items[to]?.unshift(card);

            adjustColumn(draft, from, card, -1);
            adjustColumn(draft, to, card, 1);
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          // The server refused — most likely an illegal transition that slipped past the
          // client check, or a stale board. Put the card back exactly where it was.
          patch.undo();
        }
      },
    }),
  }),
});

/** Applies a card's value to a column's count and sums, in the given direction. */
function adjustColumn(
  draft: PipelineResponse,
  status: PropertyStatus,
  card: { askingPrice: string | null; projectedCommission: string | null },
  direction: 1 | -1,
): void {
  const column = draft.columns.find((entry) => entry.status === status);
  if (!column) return;

  column.count += direction;
  column.totalValue = adjustMoney(column.totalValue, card.askingPrice, direction);
  column.projectedCommission = adjustMoney(
    column.projectedCommission,
    card.projectedCommission,
    direction,
  );
}

export const { useGetPipelineQuery, useMoveCardMutation } = pipelineApi;
