import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const LOCAL_STORAGE_CART = '@RocketShoes:cart'

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(LOCAL_STORAGE_CART);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: product } = await api.get<Product>(`/products/${productId}`)

      const cartProduct = cart.find( item => item.id === product.id)  
      const transformProductData = {...product, amount: 1 }

      if (cartProduct?.id) {
        updateProductAmount({ 
          productId: transformProductData.id,
          amount: transformProductData.amount + cartProduct.amount
        }) 
        return 
      } 

      const transformDataCart = [...cart, transformProductData]
      _onUpdateCart(transformDataCart)
    } catch {
      toast.error('Erro na adição do produto')
    }
  };
  
  const removeProduct = (productId: number) => {
    try {
      const cartProduct = cart.find( item => item.id === productId) 

      if (!cartProduct?.id) {
        throw new Error('Erro na remoção do produto')
      }

      const mapCart = cart.map( (item) => (
        item.id === productId 
        ? null
        : item
        )) as Product[]
        _onUpdateCart(mapCart)
      } catch(error) {
        toast.error(error.message)
     }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      api.get<Stock>(`/stock/${productId}`)
        .then(({ data: stock }) => {
          if (stock.amount < amount || amount === 0) { 
            toast.error('Quantidade solicitada fora de estoque')

            return 
          }  

          const mapCart = cart.map( (item) => (
            item.id === productId 
              ? { ...item, amount }
              : item
          ))

          _onUpdateCart(mapCart)
        })
        .catch( _ => {
          toast.error('Erro na alteração de quantidade do produto')
        })  
    } catch(error) {
      toast.error(error.message);
    }
  };

  const _onUpdateCart = (cart: Product[]) => {
    setCart(cart)
    localStorage.setItem(LOCAL_STORAGE_CART, JSON.stringify(cart))
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
