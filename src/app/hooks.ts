import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store';

/** Typed dispatch/selector. Components use these, never the untyped originals — that
 *  is what keeps thunk and action types flowing through. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
