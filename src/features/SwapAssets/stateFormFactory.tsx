import {
  DEFAULT_NETWORK,
  DEFAULT_NETWORK_CHAINID,
  DEFAULT_NETWORK_TICKER,
  MYC_DEX_COMMISSION_RATE
} from '@config';
import { DexAsset, DexService, getNetworkById, useNetworks } from '@services';
import translate from '@translations';
import { ISwapAsset, StoreAccount } from '@types';
import {
  bigify,
  divideBNFloats,
  formatErrorEmailMarkdown,
  generateAssetUUID,
  multiplyBNFloats,
  TUseStateReducerFactory,
  withCommission
} from '@utils';

import { LAST_CHANGED_AMOUNT, SwapFormState } from './types';

const swapFormInitialState = {
  assets: [],
  account: undefined,
  fromAsset: undefined,
  fromAmount: '',
  fromAmountError: undefined,
  isCalculatingFromAmount: false,
  toAsset: undefined,
  toAmount: '',
  toAmountError: undefined,
  isCalculatingToAmount: false,
  lastChangedAmount: LAST_CHANGED_AMOUNT.FROM
};

const SwapFormFactory: TUseStateReducerFactory<SwapFormState> = ({ state, setState }) => {
  const { networks } = useNetworks();

  const fetchSwapAssets = async () => {
    try {
      const assets = await DexService.instance.getTokenList();
      if (assets.length < 1) return;
      // sort assets alphabetically
      const newAssets = assets
        .map(
          ({ symbol, ...asset }: DexAsset): ISwapAsset => ({
            ...asset,
            ticker: symbol,
            uuid:
              symbol === DEFAULT_NETWORK_TICKER
                ? generateAssetUUID(DEFAULT_NETWORK_CHAINID)
                : generateAssetUUID(DEFAULT_NETWORK_CHAINID, asset.address)
          })
        )
        .sort((asset1: ISwapAsset, asset2: ISwapAsset) =>
          (asset1.ticker as string).localeCompare(asset2.ticker)
        );
      // set fromAsset to default (ETH)
      const network = getNetworkById(DEFAULT_NETWORK, networks);
      const fromAsset = newAssets.find((x: ISwapAsset) => x.ticker === network.baseUnit);
      const toAsset = newAssets[0];
      return [newAssets, fromAsset, toAsset];
    } catch (e) {
      console.error(e);
    }
  };

  const setSwapAssets = (assets: ISwapAsset[], fromAsset: ISwapAsset, toAsset: ISwapAsset) => {
    setState((prevState: SwapFormState) => ({
      ...prevState,
      assets,
      fromAsset,
      toAsset
    }));
  };

  const handleFromAssetSelected = (fromAsset: ISwapAsset) => {
    const { isCalculatingFromAmount, isCalculatingToAmount } = state;
    if (isCalculatingFromAmount || isCalculatingToAmount) {
      return;
    }

    setState((prevState: SwapFormState) => ({
      ...prevState,
      fromAsset,
      fromAmount: '',
      fromAmountError: '',
      toAmount: '',
      toAmountError: ''
    }));
  };

  const handleToAssetSelected = (toAsset: ISwapAsset) => {
    setState((prevState: SwapFormState) => ({
      ...prevState,
      toAsset
    }));
  };

  const calculateNewFromAmount = async (value: string) => {
    const { fromAsset, toAsset } = state;
    if (!fromAsset || !toAsset) {
      return;
    }

    if (value.length === 0) {
      setState((prevState: SwapFormState) => ({
        ...prevState,
        toAmount: '',
        fromAmount: ''
      }));
      return;
    }

    if (bigify(value).lte(0)) {
      setState((prevState: SwapFormState) => ({
        ...prevState,
        isCalculatingFromAmount: false,
        toAmountError: translate('SWAP_ZERO_VALUE')
      }));
      return;
    }

    try {
      setState((prevState: SwapFormState) => ({
        ...prevState,
        isCalculatingFromAmount: true
      }));

      const { price, sellAmount, ...rest } = await DexService.instance.getTokenPriceTo(
        fromAsset,
        toAsset,
        value
      );

      setState((prevState: SwapFormState) => ({
        ...prevState,
        isCalculatingFromAmount: false,
        fromAmount: sellAmount.toString(),
        fromAmountError: '',
        toAmountError: '',
        exchangeRate: withCommission({
          amount: divideBNFloats(1, price),
          rate: MYC_DEX_COMMISSION_RATE
        }).toString(),
        ...rest
      }));
    } catch (e) {
      if (!e.isCancel) {
        setState((prevState: SwapFormState) => ({
          ...prevState,
          isCalculatingFromAmount: false,
          toAmountError: translate('UNEXPECTED_ERROR', {
            $link: formatErrorEmailMarkdown('Swap Error', e)
          })
        }));
        console.error(e);
      }
    }
  };

  const calculateNewToAmount = async (value: string) => {
    const { fromAsset, toAsset } = state;
    if (!fromAsset || !toAsset) {
      return;
    }

    if (value.length === 0) {
      setState((prevState: SwapFormState) => ({
        ...prevState,
        toAmount: '',
        fromAmount: ''
      }));
      return;
    }

    if (bigify(value).lte(0)) {
      setState((prevState: SwapFormState) => ({
        ...prevState,
        isCalculatingToAmount: false,
        fromAmountError: translate('SWAP_ZERO_VALUE')
      }));
      return;
    }

    try {
      setState((prevState: SwapFormState) => ({
        ...prevState,
        isCalculatingToAmount: true,
        lastChangedAmount: LAST_CHANGED_AMOUNT.FROM
      }));

      const { price, buyAmount, ...rest } = await DexService.instance.getTokenPriceFrom(
        fromAsset,
        toAsset,
        value
      );

      setState((prevState: SwapFormState) => ({
        ...prevState,
        isCalculatingToAmount: false,
        toAmount: buyAmount.toString(),
        fromAmountError: '',
        toAmountError: '',
        exchangeRate: withCommission({
          amount: multiplyBNFloats(1, price), // @todo Fix this
          rate: MYC_DEX_COMMISSION_RATE
        }).toString(),
        ...rest
      }));
    } catch (e) {
      if (!e.isCancel) {
        setState((prevState: SwapFormState) => ({
          ...prevState,
          isCalculatingToAmount: false,
          fromAmountError: translate('UNEXPECTED_ERROR', {
            $link: formatErrorEmailMarkdown('Swap Error', e)
          })
        }));
        console.error(e);
      }
    }
  };

  const handleFromAmountChanged = (fromAmount: string) => {
    setState((prevState: SwapFormState) => ({
      ...prevState,
      fromAmount,
      lastChangedAmount: LAST_CHANGED_AMOUNT.FROM,
      fromAmountError: '',
      toAmountError: ''
    }));
  };

  const handleToAmountChanged = (toAmount: string) => {
    setState((prevState: SwapFormState) => ({
      ...prevState,
      toAmount,
      lastChangedAmount: LAST_CHANGED_AMOUNT.TO,
      fromAmountError: '',
      toAmountError: ''
    }));
  };

  const handleAccountSelected = (account: StoreAccount) => {
    setState((prevState: SwapFormState) => ({
      ...prevState,
      account
    }));
  };

  return {
    fetchSwapAssets,
    setSwapAssets,
    handleFromAssetSelected,
    handleToAssetSelected,
    calculateNewFromAmount,
    calculateNewToAmount,
    handleFromAmountChanged,
    handleToAmountChanged,
    handleAccountSelected,
    formState: state
  };
};

export { swapFormInitialState, SwapFormFactory };
