package bobby
{
   import flash.geom.Point;
   
   public class §_-3e§
   {
      
      public function §_-3e§()
      {
         super();
      }
      
      public static function §_-5o§(param1:Number) : Number
      {
         var _loc2_:* = param1 - 90;
         return _loc2_ * (Math.PI / 180);
      }
      
      public static function §_-1E§(param1:Number) : Boolean
      {
         if(param1 % 2 == 0)
         {
            return true;
         }
         return false;
      }
      
      public static function §_-0q§(param1:Array) : *
      {
         var _loc2_:Number = § else§(0,param1.length,true);
         return param1[_loc2_];
      }
      
      public static function §_-G§(... rest) : *
      {
         return §_-0q§(rest);
      }
      
      public static function § else§(param1:Number, param2:Number, param3:Boolean = false) : Number
      {
         var _loc4_:Number = NaN;
         if(!param3)
         {
            _loc4_ = param1 + Math.random() * (param2 - param1);
         }
         else
         {
            if(param2 >= param1)
            {
               _loc4_ = param1 + Math.random() * (param2 + 1 - param1);
            }
            else
            {
               _loc4_ = param2 + Math.random() * (param1 + 1 - param2);
            }
            _loc4_ = Math.floor(_loc4_);
         }
         return _loc4_;
      }
      
      public static function §_-29§(param1:Number, param2:Number, param3:Number, param4:Number) : Number
      {
         var _loc5_:Number = param3 - param1;
         var _loc6_:Number = param4 - param2;
         return Math.sqrt(Math.pow(_loc5_,2) + Math.pow(_loc6_,2));
      }
      
      public static function §_-3n§(param1:Number, param2:Number) : Number
      {
         var _loc3_:Number = -(param1 / param2 - 1);
         if(_loc3_ < 0)
         {
            _loc3_ = 0;
         }
         return _loc3_;
      }
      
      public static function §_-0N§(param1:Number, param2:Number) : Number
      {
         var _loc3_:Number = param1 / param2;
         if(_loc3_ < 0)
         {
            _loc3_ = 0;
         }
         return _loc3_;
      }
      
      public static function §_-k§(param1:Number) : Number
      {
         var _loc2_:Number = Math.floor(param1);
         var _loc3_:String = String(param1);
         return _loc3_.length;
      }
      
      public static function §_-3i§(param1:Number, param2:Number) : String
      {
         var _loc3_:String = param1.toString();
         var _loc4_:Number = param2 - _loc3_.length;
         while(_loc4_ > 0)
         {
            _loc3_ = "0" + _loc3_;
            _loc4_--;
         }
         return _loc3_;
      }
      
      public static function §_-m§(param1:Object, param2:Number, param3:Number, param4:Number, param5:Number, param6:Number) : void
      {
         var _loc7_:* = param1.x - param2;
         var _loc8_:* = param1.y - param3;
         var _loc9_:* = Math.sqrt(_loc7_ * _loc7_ + _loc8_ * _loc8_);
         _loc7_ /= _loc9_;
         _loc8_ /= _loc9_;
         _loc7_ *= param4;
         _loc8_ *= param4;
         _loc7_ *= -1;
         _loc8_ *= -1;
         param1.dx += _loc7_;
         param1.dy += _loc8_;
         param1.dir = Math.atan2(param1.dy,param1.dx) / 3.141593 * 180 + 90;
         param1.rotation = param1.dir;
         param1.speed = Math.pow(Math.pow(param1.dx,2) + Math.pow(param1.dy,2),0.5);
         if(param1.speed > param6)
         {
            param1.speed = param6;
         }
         if(param1.speed < param5)
         {
            param1.speed = param5;
         }
         §_-3e§.§_-12§(param1);
      }
      
      public static function §_-d§(param1:Object, param2:Object, param3:Number) : void
      {
         var _loc9_:Number = NaN;
         var _loc10_:Number = NaN;
         var _loc11_:Number = NaN;
         var _loc12_:Number = NaN;
         var _loc4_:Number = Number(param1.x);
         var _loc5_:Number = Number(param1.y);
         var _loc6_:Number = param2.x - _loc4_;
         var _loc7_:Number = param2.y - _loc5_;
         var _loc8_:Number = Math.sqrt(_loc6_ * _loc6_ + _loc7_ * _loc7_);
         if(_loc8_ < param3 && _loc8_ != 0)
         {
            _loc9_ = _loc6_ / _loc8_;
            _loc10_ = _loc7_ / _loc8_;
            _loc11_ = (_loc4_ + param2.x) / 2;
            _loc12_ = (_loc5_ + param2.y) / 2;
            param1.x = _loc11_ - _loc9_ * param3 / 2;
            param1.y = _loc12_ - _loc10_ * param3 / 2;
            param2.x = _loc11_ + _loc9_ * param3 / 2;
            param2.y = _loc12_ + _loc10_ * param3 / 2;
         }
      }
      
      public static function §_-4q§(param1:Array, param2:Point) : Boolean
      {
         var _loc4_:int = 0;
         var _loc5_:Number = NaN;
         var _loc6_:Point = null;
         var _loc7_:Point = null;
         var _loc3_:int = 0;
         var _loc8_:int = int(param1.length);
         _loc6_ = param1[0];
         _loc4_ = 1;
         while(_loc4_ <= _loc8_)
         {
            _loc7_ = param1[_loc4_ % _loc8_];
            if(param2.y > Math.min(_loc6_.y,_loc7_.y))
            {
               if(param2.y <= Math.max(_loc6_.y,_loc7_.y))
               {
                  if(param2.x <= Math.max(_loc6_.x,_loc7_.x))
                  {
                     if(_loc6_.y != _loc7_.y)
                     {
                        _loc5_ = (param2.y - _loc6_.y) * (_loc7_.x - _loc6_.x) / (_loc7_.y - _loc6_.y) + _loc6_.x;
                        if(_loc6_.x == _loc7_.x || param2.x <= _loc5_)
                        {
                           _loc3_++;
                        }
                     }
                  }
               }
            }
            _loc6_ = _loc7_;
            _loc4_++;
         }
         if(_loc3_ % 2 == 0)
         {
            return false;
         }
         return true;
      }
      
      public static function §_-2h§(param1:Array, param2:Object) : Boolean
      {
         var _loc3_:int = 0;
         var _loc4_:Boolean = false;
         while(_loc3_ < param1.length)
         {
            if(param1[_loc3_] == param2)
            {
               param1.splice(_loc3_,1);
               _loc4_ = true;
            }
            else
            {
               _loc3_++;
            }
         }
         return _loc4_;
      }
      
      public static function §_-3M§(param1:Number) : Boolean
      {
         if(Math.random() * 100 < param1)
         {
            return true;
         }
         return false;
      }
      
      public static function §_-2M§(param1:Number) : Number
      {
         if(Math.random() > 0.5)
         {
            return param1;
         }
         return -param1;
      }
      
      public static function §_-1w§(param1:Number) : Number
      {
         if(param1 >= 0)
         {
            return 1;
         }
         return -1;
      }
      
      public static function §_-3r§(param1:Number) : Number
      {
         return 1 / param1;
      }
      
      public static function §_-2m§(param1:Object) : void
      {
         param1.dir = Math.atan2(param1.dy,param1.dx) / Math.PI * 180 + 90;
      }
      
      public static function §_-7§(param1:Object) : void
      {
         param1.speed = Math.sqrt(param1.dx * param1.dx + param1.dy * param1.dy);
      }
      
      public static function §_-12§(param1:Object) : void
      {
         var _loc2_:Number = param1.dir - 90;
         var _loc3_:Number = _loc2_ / 180 * Math.PI;
         param1.dx = Math.cos(_loc3_);
         param1.dy = Math.sin(_loc3_);
         param1.dx *= param1.speed;
         param1.dy *= param1.speed;
      }
      
      public static function §try§(param1:Array) : void
      {
         var _loc2_:int = 0;
         while(_loc2_ < param1.length)
         {
            param1[_loc2_].parent.removeChild(param1[_loc2_]);
            _loc2_++;
         }
         param1.splice(0,param1.length);
      }
      
      public static function §_-5y§(param1:Number, param2:Number, param3:Number, param4:Number) : Number
      {
         var _loc5_:Number = param3 - param1;
         var _loc6_:Number = -(param4 - param2);
         var _loc7_:Number = Math.atan2(_loc5_,_loc6_);
         return _loc7_ / Math.PI * 180 + 0;
      }
   }
}

