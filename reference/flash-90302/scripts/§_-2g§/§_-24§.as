package §_-2g§
{
   import §_-0V§.§_-h§;
   import §_-2s§.§_-u§;
   import bobby.§ null§;
   import bobby.§_-0v§;
   import bobby.§_-2W§;
   import bobby.§_-3e§;
   import bobby.§_-3h§;
   import flash.display.MovieClip;
   import flash.events.Event;
   import fx.BigSpark;
   import fx.ParticleBirdie;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol100")]
   public class §_-24§ extends § null§
   {
      
      public var §_-3O§:MovieClip;
      
      public var dx:Number = 0;
      
      public var dy:Number = 0;
      
      public var speed:Number = 0;
      
      public var dir:Number = 0;
      
      public var §else §:Number = 0;
      
      private var §_-4t§:Number = 1200;
      
      public var §import§:§_-h§;
      
      public function §_-24§()
      {
         super();
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
      }
      
      public function §_-5z§(param1:Number, param2:Number, param3:String = "") : void
      {
         var _loc4_:BigSpark = null;
         var _loc5_:Number = NaN;
         var _loc6_:Number = NaN;
         var _loc7_:Number = NaN;
         var _loc8_:Number = NaN;
         var _loc9_:* = undefined;
         if(§_-u§.§_-3P§)
         {
            this.speed = param1;
            this.dir = param2;
            rotation = this.dir;
            _loc4_ = §_-2W§.§_-55§(new BigSpark(),§_-0v§.§_-b§,this.x,this.y);
            _loc4_.rotation = param2;
            if(param3 == "serve")
            {
               _loc4_.scaleX = _loc4_.scaleY = 0.6;
            }
            if(param3 == "underhand")
            {
               _loc4_.scaleX = _loc4_.scaleY = 0.6;
            }
            if(Math.abs(param2) <= 80)
            {
               _loc4_.scaleX = _loc4_.scaleY = 0.6;
            }
            _loc4_.scaleX = _loc4_.scaleY = 0.3;
            if(param3 != "nosound")
            {
               §_-3h§.§true §("birdiehit.mp3");
            }
            §_-3e§.§_-12§(this);
            _loc5_ = x;
            _loc6_ = y;
            _loc7_ = this.dx;
            _loc8_ = this.dy;
            if(_loc6_ > §_-u§.§_-0o§)
            {
               _loc6_ = §_-u§.§_-0o§ - 1;
            }
            while(_loc6_ < §_-u§.§_-0o§)
            {
               _loc9_ = 1 / stage.frameRate;
               _loc8_ += this.§_-4t§ * _loc9_;
               _loc8_ = _loc8_ * Math.pow(0.96,60 * _loc9_);
               _loc7_ *= Math.pow(0.96,60 * _loc9_);
               _loc5_ += _loc7_ * _loc9_;
               _loc6_ += _loc8_ * _loc9_;
               if(_loc5_ > stage.stageWidth - §_-u§.§try §)
               {
                  _loc5_ = stage.stageWidth - §_-u§.§try §;
                  _loc7_ *= -0.8;
                  if(Math.abs(_loc7_) < 200)
                  {
                     _loc7_ = 200 * §_-3e§.§_-1w§(_loc7_);
                  }
               }
               if(_loc5_ < 0 + §_-u§.§try §)
               {
                  _loc5_ = 0 + §_-u§.§try §;
                  _loc7_ *= -0.8;
                  if(Math.abs(_loc7_) < 200)
                  {
                     _loc7_ = 200 * §_-3e§.§_-1w§(_loc7_);
                  }
               }
               if(§_-u§.§_-0m§.hitTestPoint(_loc5_,_loc6_,false))
               {
                  while(§_-u§.§_-0m§.hitTestPoint(_loc5_,_loc6_,false))
                  {
                     if(_loc7_ > 0)
                     {
                        _loc5_--;
                     }
                     else
                     {
                        _loc5_ += 1;
                     }
                  }
                  _loc7_ *= -0.1;
                  _loc8_ *= 0.1;
               }
            }
            this.§else § = _loc5_;
         }
      }
      
      private function §_-3Q§() : Boolean
      {
         if(§_-u§.§_-3c§.hitTestPoint(x,y,false) && this.dy > 0)
         {
            while(§_-u§.§_-0m§.hitTestPoint(x,y,false))
            {
               y = y - 1;
            }
            this.dy *= 0.3;
            this.dx *= 0.8;
            if(this.dy > -100)
            {
               this.dy = -100;
            }
            if(Math.abs(this.dx) < 100)
            {
               if(§_-3e§.§_-3M§(50))
               {
                  this.dx = -150;
               }
               else
               {
                  this.dx = 150;
               }
            }
            §_-u§.§_-0l§.play();
            return true;
         }
         if(§_-u§.§_-0m§.hitTestPoint(x,y,false))
         {
            while(§_-u§.§_-0m§.hitTestPoint(x,y,false))
            {
               if(this.dx > 0)
               {
                  x = x - 1;
               }
               else
               {
                  x += 1;
               }
            }
            this.dx *= -0.1;
            this.dy *= 0.1;
            §_-u§.§_-0l§.play();
            return true;
         }
         return false;
      }
      
      private function § set§() : void
      {
         §_-2W§.§_-55§(new ParticleBirdie(),§_-u§(§_-0v§.§_-b§).§false§,x,y);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
         if(Math.abs(this.dy) > 0)
         {
            this.dy += this.§_-4t§ * param1;
         }
         this.dy *= Math.pow(0.96,60 * param1);
         this.dx *= Math.pow(0.96,60 * param1);
         var _loc2_:Number = x;
         var _loc3_:Number = y;
         if(Math.abs(this.dx) > 5)
         {
            x += this.dx * param1;
         }
         if(Math.abs(this.dy) > 5)
         {
            y += this.dy * param1;
         }
         §_-3e§.§_-2m§(this);
         rotation = this.dir;
         §_-3e§.§_-7§(this);
         if(this.speed > 50)
         {
            if(§_-3e§.§_-3M§(this.speed * 100 / 1400))
            {
               this.§ set§();
               this.§ set§();
            }
         }
         if(y < -500)
         {
            y = -500;
         }
         if(x > stage.stageWidth - §_-u§.§try §)
         {
            x = stage.stageWidth - §_-u§.§try §;
            this.dx *= -0.8;
            if(Math.abs(this.dx) < 200)
            {
               this.dx = 200 * §_-3e§.§_-1w§(this.dx);
            }
         }
         if(x < 0 + §_-u§.§try §)
         {
            x = 0 + §_-u§.§try §;
            this.dx *= -0.8;
            if(Math.abs(this.dx) < 200)
            {
               this.dx = 200 * §_-3e§.§_-1w§(this.dx);
            }
         }
         var _loc4_:Number = x;
         var _loc5_:Number = y;
         var _loc6_:Boolean = false;
         var _loc7_:Number = 1;
         while(!_loc6_)
         {
            x = _loc7_ * (_loc4_ - _loc2_) / 4 + _loc2_;
            y = _loc7_ * (_loc5_ - _loc3_) / 4 + _loc3_;
            _loc6_ = this.§_-3Q§();
            if(_loc7_ == 4)
            {
               break;
            }
            _loc7_++;
         }
         if(y > §_-u§.§_-0o§)
         {
            this.dy *= -0.4;
            y = §_-u§.§_-0o§;
            if(x > §_-u§.§_-0l§.x)
            {
               §_-u§(§_-0v§.§_-b§).§_-43§(1);
            }
            else
            {
               §_-u§(§_-0v§.§_-b§).§_-43§(2);
            }
            if(Math.abs(this.dy) < 5)
            {
               this.dy = 0;
            }
         }
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
      }
   }
}

