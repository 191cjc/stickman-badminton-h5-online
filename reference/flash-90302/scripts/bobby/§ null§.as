package bobby
{
   import flash.display.MovieClip;
   import flash.events.Event;
   
   public class § null§ extends MovieClip
   {
      
      public var racket:MovieClip;
      
      public var mc:MovieClip;
      
      public var removeMe:Boolean = false;
      
      private var §_-2K§:Number = 0;
      
      private var §get §:Boolean = false;
      
      private var §_-32§:Number = 0;
      
      public function § null§()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.handleStageAdd);
         if(totalFrames > 1)
         {
            this.play();
         }
      }
      
      override public function play() : void
      {
         if(!this.§get §)
         {
            this.§get § = true;
            §_-0v§.§_-6-§(this.§_-4e§);
         }
      }
      
      override public function stop() : void
      {
         if(this.§get §)
         {
            this.§get § = false;
            §_-0v§.§ do§(this.§_-4e§);
            this.§_-32§ = currentFrame * this.§_-2K§;
         }
      }
      
      override public function gotoAndPlay(param1:Object, param2:String = null) : void
      {
         this.gotoAndStop(param1,param2);
         this.play();
      }
      
      override public function gotoAndStop(param1:Object, param2:String = null) : void
      {
         super.gotoAndStop(param1,param2);
         this.§_-32§ = currentFrame * this.§_-2K§;
         this.stop();
      }
      
      private function §_-4e§(param1:Number) : *
      {
         this.§_-32§ += param1;
         var _loc2_:int = Math.floor(this.§_-32§ / this.§_-2K§) + 1;
         var _loc3_:Number = currentFrame;
         var _loc4_:Number = _loc2_ - currentFrame;
         var _loc5_:Number = 0;
         while(_loc5_ < _loc4_ && this.§get §)
         {
            _loc5_++;
            super.gotoAndStop((_loc3_ + _loc5_ - 1) % totalFrames + 1);
         }
      }
      
      public function set §_-5X§(param1:Number) : void
      {
         this.§_-2K§ = 1 / param1;
         if(this.§_-2K§ != 0)
         {
            this.§_-32§ = currentFrame * this.§_-2K§;
         }
      }
      
      public function get §_-5X§() : Number
      {
         if(this.§_-2K§ == 0)
         {
            return 9999999;
         }
         return Math.round(1 / this.§_-2K§);
      }
      
      public function handleStageAdd(param1:Event) : void
      {
         if(this.§_-2K§ == 0)
         {
            this.§_-5X§ = stage.frameRate;
         }
         super.gotoAndStop(1);
         this.§_-32§ = 0;
         removeEventListener(Event.ADDED_TO_STAGE,this.handleStageAdd);
         addEventListener(Event.REMOVED_FROM_STAGE,this.handleRemove);
      }
      
      public function handleEnterFrame(param1:Number) : void
      {
      }
      
      public function handleRemove(param1:Event) : void
      {
         removeEventListener(Event.REMOVED_FROM_STAGE,this.handleRemove);
         this.stop();
      }
      
      public function remove() : void
      {
         parent.removeChild(this);
      }
   }
}

